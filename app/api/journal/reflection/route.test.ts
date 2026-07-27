import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The reflection GET/PUT handlers resolve the canonical logical day via
// resolveLogicalToday, validate the payload with the real lib/journal helpers,
// and read/upsert JournalEntry scoped by the SESSION user id. Auth, connectDB,
// resolveLogicalToday and the model are mocked; the pure validation runs for
// real. recomputeDailyLog is deliberately NOT imported by this route — saving a
// reflection must never touch challenge completion.

const { auth, connectDB, resolveLogicalToday, findOne, findOneAndUpdate } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  resolveLogicalToday: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/models/JournalEntry', () => ({ JournalEntry: { findOne, findOneAndUpdate } }))

import { GET, PUT } from './route'

const USER_A = '507f1f77bcf86cd799439011'
const USER_B = '507f1f77bcf86cd799439099'
const TODAY = '2026-07-27'

/** Mock a `.select(...).lean()` chain resolving to `doc`. */
function chain(doc: unknown) {
  return { select: () => ({ lean: () => Promise.resolve(doc) }) }
}

function getReq(search = '') {
  return new NextRequest(`http://localhost/api/journal/reflection${search}`)
}

function putReq(body: unknown) {
  return new NextRequest('http://localhost/api/journal/reflection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER_A } })
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(TODAY)
  findOne.mockReset().mockReturnValue(chain(null))
  findOneAndUpdate.mockReset().mockReturnValue(chain(null))
})

describe('GET /api/journal/reflection', () => {
  it('401s without a valid session', async () => {
    auth.mockResolvedValueOnce(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
    expect(findOne).not.toHaveBeenCalled()
  })

  it('401s when the session id is not a valid ObjectId', async () => {
    auth.mockResolvedValueOnce({ user: { id: 'not-an-id' } })
    expect((await GET(getReq())).status).toBe(401)
  })

  it('defaults to the canonical logical today (never a raw UTC slice)', async () => {
    const body = await (await GET(getReq())).json()
    expect(resolveLogicalToday).toHaveBeenCalledWith(USER_A)
    expect(findOne).toHaveBeenCalledWith({ userId: USER_A, date: TODAY })
    expect(body).toMatchObject({ today: TODAY, date: TODAY, isToday: true, entry: null })
  })

  it('scopes the query to the AUTHENTICATED user, never a requested one', async () => {
    auth.mockResolvedValue({ user: { id: USER_B } })
    await GET(getReq(`?date=2026-07-20&userId=${USER_A}`))
    expect(findOne).toHaveBeenCalledWith({ userId: USER_B, date: '2026-07-20' })
  })

  it('returns a stored reflection for a past date', async () => {
    findOne.mockReturnValue(
      chain({ mood: 'good', title: 'Solid', reflection: 'Trained early', updatedAt: new Date('2026-07-20T10:00:00Z') })
    )
    const body = await (await GET(getReq('?date=2026-07-20'))).json()
    expect(body.date).toBe('2026-07-20')
    expect(body.isToday).toBe(false)
    expect(body.entry).toEqual({
      mood: 'good',
      title: 'Solid',
      reflection: 'Trained early',
      gratitude: '',
      tomorrowFocus: '',
    })
    expect(body.updatedAt).toBe('2026-07-20T10:00:00.000Z')
  })

  it('reports a reading-only row as "no reflection yet"', async () => {
    findOne.mockReturnValue(chain({ bookTitle: 'Deep Work', pagesRead: 24 }))
    const body = await (await GET(getReq())).json()
    expect(body.entry).toBeNull()
    expect(body.hasReading).toBe(true)
  })

  it('400s on a malformed or impossible date', async () => {
    for (const bad of ['27-07-2026', '2026-7-1', '2026-02-31', 'today']) {
      const res = await GET(getReq(`?date=${encodeURIComponent(bad)}`))
      expect(res.status, bad).toBe(400)
      expect((await res.json()).code).toBe('invalid_date')
    }
    expect(findOne).not.toHaveBeenCalled()
  })

  it('400s on a future date', async () => {
    const res = await GET(getReq('?date=2026-07-28'))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('future_date')
  })

  it('returns a safe error and leaks nothing when the read throws', async () => {
    findOne.mockImplementation(() => {
      throw new Error('E11000 connection string mongodb+srv://user:pw@cluster')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(getReq())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.code).toBe('read_failed')
    expect(JSON.stringify(body)).not.toContain('mongodb+srv')
  })
})

describe('PUT /api/journal/reflection', () => {
  it('401s without a valid session', async () => {
    auth.mockResolvedValueOnce(null)
    expect((await PUT(putReq({ reflection: 'x' }))).status).toBe(401)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('creates the entry for today by upsert on { userId, date }', async () => {
    findOneAndUpdate.mockReturnValue(chain({ mood: 'great', reflection: 'Great day' }))
    const res = await PUT(putReq({ mood: 'great', reflection: '  Great day  ' }))
    expect(res.status).toBe(200)

    const [filter, update, options] = findOneAndUpdate.mock.calls[0]
    expect(filter).toEqual({ userId: USER_A, date: TODAY })
    expect(update.$set).toMatchObject({ mood: 'great', reflection: 'Great day' })
    expect(options.upsert).toBe(true)
    expect((await res.json()).entry.reflection).toBe('Great day')
  })

  it('updates an existing day through the SAME upsert — no second document', async () => {
    findOneAndUpdate.mockReturnValue(chain({ mood: 'low', reflection: 'Edited' }))
    await PUT(putReq({ date: '2026-07-20', mood: 'low', reflection: 'Edited' }))

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1)
    const [filter, , options] = findOneAndUpdate.mock.calls[0]
    expect(filter).toEqual({ userId: USER_A, date: '2026-07-20' })
    expect(options.upsert).toBe(true)
  })

  it('never writes the reading fields, so challenge completion cannot change', async () => {
    findOneAndUpdate.mockReturnValue(chain({ reflection: 'x' }))
    await PUT(putReq({ reflection: 'x', bookTitle: 'Hacked', pagesRead: 999, notes: 'n' }))

    const [, update] = findOneAndUpdate.mock.calls[0]
    const written = Object.keys(update.$set)
    expect(written.sort()).toEqual(['gratitude', 'reflection', 'title', 'tomorrowFocus'])
    expect(JSON.stringify(update)).not.toContain('pagesRead')
    expect(JSON.stringify(update)).not.toContain('bookTitle')
  })

  it('unsets a cleared mood instead of leaving a stale one', async () => {
    findOneAndUpdate.mockReturnValue(chain({ reflection: 'x' }))
    await PUT(putReq({ mood: null, reflection: 'x' }))
    const [, update] = findOneAndUpdate.mock.calls[0]
    expect(update.$unset).toEqual({ mood: '' })
  })

  it('ignores a spoofed userId in the body and writes as the session user', async () => {
    findOneAndUpdate.mockReturnValue(chain({ reflection: 'x' }))
    await PUT(putReq({ reflection: 'x', userId: USER_B }))
    const [filter, update] = findOneAndUpdate.mock.calls[0]
    expect(filter.userId).toBe(USER_A)
    expect(JSON.stringify(update)).not.toContain(USER_B)
  })

  it('rejects an empty entry (the chosen contract) without touching the DB', async () => {
    const res = await PUT(putReq({ title: '   ', reflection: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('empty')
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('rejects over-long text and names the field', async () => {
    const res = await PUT(putReq({ reflection: 'a'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'too_long', field: 'reflection' })
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('rejects an unknown mood', async () => {
    const res = await PUT(putReq({ mood: 'ecstatic', reflection: 'x' }))
    expect((await res.json()).code).toBe('invalid_mood')
    expect(res.status).toBe(400)
  })

  it('rejects an invalid or future date', async () => {
    expect((await (await PUT(putReq({ date: '2026-13-40', reflection: 'x' }))).json()).code).toBe('invalid_date')
    expect((await (await PUT(putReq({ date: '2026-08-01', reflection: 'x' }))).json()).code).toBe('future_date')
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('returns a safe error and leaks nothing when the write throws', async () => {
    findOneAndUpdate.mockImplementation(() => {
      throw new Error('MongoServerError: auth failed for user admin@cluster0')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await PUT(putReq({ reflection: 'x' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.code).toBe('save_failed')
    expect(JSON.stringify(body)).not.toContain('auth failed')
  })
})
