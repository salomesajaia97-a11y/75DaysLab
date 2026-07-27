// Cross-user isolation contract for EVERY Journal endpoint, in one place.
//
// The guarantee under test is structural: the owner identity always comes from
// `session.user.id`, and every read filter, every write filter and every upsert
// filter carries it. These tests therefore assert the exact Mongo filters the
// routes build — a leak would show up as a filter missing `userId`, or as a
// filter carrying an id that came from the request instead of the session.
//
// Auth, connectDB, resolveLogicalToday and the model are mocked; the real
// validation helpers run.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { auth, connectDB, resolveLogicalToday, recomputeDailyLog, findOne, findOneAndUpdate, find } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    connectDB: vi.fn().mockResolvedValue(undefined),
    resolveLogicalToday: vi.fn(),
    recomputeDailyLog: vi.fn().mockResolvedValue(undefined),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
  }))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/lib/recompute-daily-log', () => ({ recomputeDailyLog }))
vi.mock('@/models/JournalEntry', () => ({
  JournalEntry: { findOne, findOneAndUpdate, find },
}))

import { GET as readingGet, POST as readingPost } from './route'
import { GET as reflectionGet, PUT as reflectionPut } from './reflection/route'
import { GET as historyGet } from './history/route'

const USER_A = '507f1f77bcf86cd799439011'
const USER_B = '507f1f77bcf86cd799439099'
const DATE = '2026-07-27'

/** The reflection fields a reflection write is allowed to touch. */
const REFLECTION_FIELDS = ['gratitude', 'mood', 'reflection', 'title', 'tomorrowFocus']
/** The reading fields a reading write is allowed to touch. */
const READING_FIELDS = ['bookTitle', 'notes', 'pagesRead']

function chain(doc: unknown) {
  return { select: () => ({ lean: () => Promise.resolve(doc) }) }
}
function findChain(docs: unknown[]) {
  return { select: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(docs) }) }) }) }
}

const signedInAs = (id: string) => auth.mockResolvedValue({ user: { id } })

const req = (path: string, search = '') => new NextRequest(`http://localhost${path}${search}`)
const jsonReq = (path: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

/** Every filter object the model was queried/updated with, across all methods. */
function allFilters(): Record<string, unknown>[] {
  return [
    ...findOne.mock.calls.map((c) => c[0]),
    ...findOneAndUpdate.mock.calls.map((c) => c[0]),
    ...find.mock.calls.map((c) => c[0]),
  ] as Record<string, unknown>[]
}

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(DATE)
  recomputeDailyLog.mockClear()
  findOne.mockReset().mockReturnValue(chain(null))
  findOneAndUpdate.mockReset().mockReturnValue(chain({ reflection: 'x' }))
  find.mockReset().mockReturnValue(findChain([]))
  signedInAs(USER_A)
})

describe('1. User A cannot read User B\'s entry', () => {
  it('every read filter is scoped to the session user, on every endpoint', async () => {
    // findOne on the reading route resolves directly (no .select chain).
    findOne.mockResolvedValue(null)
    await readingGet(req('/api/journal', `?date=${DATE}&userId=${USER_B}`))

    findOne.mockReturnValue(chain(null))
    await reflectionGet(req('/api/journal/reflection', `?date=${DATE}&userId=${USER_B}`))
    await historyGet(req('/api/journal/history', `?userId=${USER_B}`))

    const filters = allFilters()
    expect(filters).toHaveLength(3)
    for (const f of filters) {
      expect(f.userId, JSON.stringify(f)).toBe(USER_A)
      expect(JSON.stringify(f)).not.toContain(USER_B)
    }
  })

  it('a userId in a header or in the path is never consulted', async () => {
    findOne.mockReturnValue(chain(null))
    await reflectionGet(
      new NextRequest(`http://localhost/api/journal/reflection?date=${DATE}`, {
        headers: { 'x-user-id': USER_B, 'x-userid': USER_B },
      })
    )
    expect(findOne.mock.calls[0][0]).toEqual({ userId: USER_A, date: DATE })
  })
})

describe('2. User A cannot update User B\'s entry', () => {
  it('the reflection upsert filter uses the session user, not the body userId', async () => {
    await reflectionPut(
      jsonReq('/api/journal/reflection', 'PUT', { date: DATE, reflection: 'mine', userId: USER_B })
    )
    const [filter, update] = findOneAndUpdate.mock.calls[0]
    expect(filter).toEqual({ userId: USER_A, date: DATE })
    expect(JSON.stringify(update)).not.toContain(USER_B)
  })

  it('the reading upsert filter uses the session user, not the body userId', async () => {
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(
      jsonReq('/api/journal', 'POST', { bookTitle: 'Deep Work', pagesRead: 24, userId: USER_B })
    )
    const [filter, update] = findOneAndUpdate.mock.calls[0]
    expect(filter).toEqual({ userId: USER_A, date: DATE })
    expect(JSON.stringify(update)).not.toContain(USER_B)
  })

  it('no write ever puts userId inside the update payload (it lives only in the filter)', async () => {
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x' }))
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(jsonReq('/api/journal', 'POST', { bookTitle: 'B', pagesRead: 12 }))

    for (const [, update] of findOneAndUpdate.mock.calls) {
      const written = Object.values(update as Record<string, Record<string, unknown>>)
        .flatMap((op) => Object.keys(op))
      expect(written).not.toContain('userId')
      expect(written).not.toContain('_id')
    }
  })
})

describe("3. User A's history excludes User B's entries", () => {
  it('filters by the session user and a date window — never by date alone', async () => {
    await historyGet(req('/api/journal/history', '?days=7'))
    const filter = find.mock.calls[0][0] as Record<string, unknown>
    expect(filter.userId).toBe(USER_A)
    expect(filter.date).toEqual({ $gte: '2026-07-21', $lte: DATE })
    expect(Object.keys(filter).sort()).toEqual(['date', 'userId'])
  })

  it('User B signed in gets a filter scoped to B, never to A', async () => {
    signedInAs(USER_B)
    await historyGet(req('/api/journal/history'))
    expect((find.mock.calls[0][0] as Record<string, unknown>).userId).toBe(USER_B)
  })
})

describe('4. The same date may exist once for User A and once for User B', () => {
  it('produces two independent upserts differing only by userId', async () => {
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { date: DATE, reflection: 'A day' }))
    signedInAs(USER_B)
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { date: DATE, reflection: 'B day' }))

    const filters = findOneAndUpdate.mock.calls.map((c) => c[0])
    expect(filters).toEqual([
      { userId: USER_A, date: DATE },
      { userId: USER_B, date: DATE },
    ])
    // Same date, different owners => the compound unique index cannot collide.
    expect(filters[0].date).toBe(filters[1].date)
    expect(filters[0].userId).not.toBe(filters[1].userId)
  })
})

describe('5. A client-supplied userId is ignored', () => {
  it.each([
    ['query', () => reflectionGet(req('/api/journal/reflection', `?userId=${USER_B}`))],
    ['body', () => reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x', userId: USER_B }))],
    ['body _id', () => reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x', _id: 'deadbeefdeadbeefdeadbeef' }))],
  ])('%s', async (_label, run) => {
    await run()
    for (const f of allFilters()) expect(f.userId).toBe(USER_A)
    for (const [, update] of findOneAndUpdate.mock.calls) {
      expect(JSON.stringify(update)).not.toContain(USER_B)
      expect(JSON.stringify(update)).not.toContain('deadbeef')
    }
  })

  it('401s when there is no session at all, before any query runs', async () => {
    auth.mockResolvedValue(null)
    expect((await readingGet(req('/api/journal'))).status).toBe(401)
    expect((await reflectionGet(req('/api/journal/reflection'))).status).toBe(401)
    expect((await historyGet(req('/api/journal/history'))).status).toBe(401)
    expect((await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x' }))).status).toBe(401)
    expect((await readingPost(jsonReq('/api/journal', 'POST', { bookTitle: 'B', pagesRead: 12 }))).status).toBe(401)
    expect(allFilters()).toHaveLength(0)
  })

  it('401s on a session id that is not a valid ObjectId, before any query runs', async () => {
    signedInAs('../../admin')
    expect((await readingGet(req('/api/journal'))).status).toBe(401)
    expect((await reflectionGet(req('/api/journal/reflection'))).status).toBe(401)
    expect((await historyGet(req('/api/journal/history'))).status).toBe(401)
    expect(allFilters()).toHaveLength(0)
  })
})

describe('6. Upsert filters include the authenticated userId and the date', () => {
  it('reflection upsert is keyed on exactly { userId, date } with upsert enabled', async () => {
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x' }))
    const [filter, , options] = findOneAndUpdate.mock.calls[0]
    expect(Object.keys(filter as object).sort()).toEqual(['date', 'userId'])
    expect(filter).toEqual({ userId: USER_A, date: DATE })
    expect((options as { upsert?: boolean }).upsert).toBe(true)
  })

  it('reading upsert is keyed on exactly { userId, date } with upsert enabled', async () => {
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(jsonReq('/api/journal', 'POST', { bookTitle: 'Deep Work', pagesRead: 24 }))
    const [filter, , options] = findOneAndUpdate.mock.calls[0]
    expect(Object.keys(filter as object).sort()).toEqual(['date', 'userId'])
    expect((options as { upsert?: boolean }).upsert).toBe(true)
  })
})

describe('7. Reading and reflection writes preserve each other on the same row', () => {
  it('a reflection write touches only reflection fields, never the reading half', async () => {
    await reflectionPut(
      jsonReq('/api/journal/reflection', 'PUT', {
        mood: 'good',
        reflection: 'mine',
        // these must be ignored, not written
        bookTitle: 'Hijacked',
        pagesRead: 999,
        notes: 'Hijacked',
      })
    )
    const [, update] = findOneAndUpdate.mock.calls[0] as [unknown, Record<string, Record<string, unknown>>]
    const written = Object.values(update).flatMap((op) => Object.keys(op)).sort()
    expect(written).toEqual(REFLECTION_FIELDS)
    for (const field of READING_FIELDS) expect(written).not.toContain(field)
  })

  it('a reading write touches only reading fields, never the reflection half', async () => {
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(
      jsonReq('/api/journal', 'POST', {
        bookTitle: 'Deep Work',
        pagesRead: 24,
        notes: 'ch2',
        // these must be ignored, not written
        mood: 'great',
        reflection: 'Hijacked',
      })
    )
    const [, update] = findOneAndUpdate.mock.calls[0] as [unknown, Record<string, Record<string, unknown>>]
    const written = Object.values(update).flatMap((op) => Object.keys(op)).sort()
    expect(written).toEqual(READING_FIELDS)
    for (const field of REFLECTION_FIELDS) expect(written).not.toContain(field)
  })

  it('both writes use update operators, never a replacement document', async () => {
    // A replacement doc (no $-prefixed keys) would silently delete the other
    // half of the row on every save.
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x' }))
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(jsonReq('/api/journal', 'POST', { bookTitle: 'B', pagesRead: 12 }))

    for (const [, update] of findOneAndUpdate.mock.calls) {
      const keys = Object.keys(update as object)
      expect(keys.length).toBeGreaterThan(0)
      expect(keys.every((k) => k.startsWith('$')), `replacement-style update: ${keys}`).toBe(true)
    }
  })
})

describe('the completion spine is only ever recomputed for the session user', () => {
  it('reading saves recompute for the session user id', async () => {
    findOneAndUpdate.mockResolvedValue({ bookTitle: 'x' })
    await readingPost(jsonReq('/api/journal', 'POST', { bookTitle: 'B', pagesRead: 12, userId: USER_B }))
    expect(recomputeDailyLog).toHaveBeenCalledWith(USER_A, DATE, undefined, expect.any(Function))
  })

  it('reflection saves never recompute at all', async () => {
    await reflectionPut(jsonReq('/api/journal/reflection', 'PUT', { reflection: 'x' }))
    expect(recomputeDailyLog).not.toHaveBeenCalled()
  })
})
