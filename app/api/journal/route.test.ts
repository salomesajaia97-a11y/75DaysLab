import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Regression cover for the reading-log route. Its POST contract (title
// required, >= 10 pages, recomputes the daily spine) is UNCHANGED by the
// reflection feature — these tests pin that, plus the newly validated ?date=.

const { auth, connectDB, resolveLogicalToday, recomputeDailyLog, findOne, findOneAndUpdate } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    connectDB: vi.fn().mockResolvedValue(undefined),
    resolveLogicalToday: vi.fn(),
    recomputeDailyLog: vi.fn().mockResolvedValue(undefined),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/lib/recompute-daily-log', () => ({ recomputeDailyLog }))
vi.mock('@/models/JournalEntry', () => ({ JournalEntry: { findOne, findOneAndUpdate } }))

import { GET, POST } from './route'

const USER_A = '507f1f77bcf86cd799439011'
const USER_B = '507f1f77bcf86cd799439099'
const TODAY = '2026-07-27'

const getReq = (search = '') => new NextRequest(`http://localhost/api/journal${search}`)

const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER_A } })
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(TODAY)
  recomputeDailyLog.mockClear()
  findOne.mockReset().mockResolvedValue(null)
  findOneAndUpdate.mockReset().mockResolvedValue({ bookTitle: 'Deep Work', pagesRead: 24 })
})

describe('GET /api/journal (reading log)', () => {
  it('401s without a session', async () => {
    auth.mockResolvedValueOnce(null)
    expect((await GET(getReq())).status).toBe(401)
  })

  it('defaults to the canonical logical today', async () => {
    await GET(getReq())
    expect(findOne).toHaveBeenCalledWith({ userId: USER_A, date: TODAY })
  })

  it('400s on a malformed date instead of querying with it', async () => {
    for (const bad of ['2026-7-1', '2026-02-31', 'yesterday', '']) {
      const res = await GET(getReq(`?date=${encodeURIComponent(bad)}`))
      expect(res.status, bad).toBe(400)
      expect((await res.json()).code).toBe('invalid_date')
    }
    expect(findOne).not.toHaveBeenCalled()
  })

  it('reads only the authenticated user, whatever the request asks for', async () => {
    auth.mockResolvedValue({ user: { id: USER_B } })
    await GET(getReq(`?date=2026-07-20&userId=${USER_A}`))
    expect(findOne).toHaveBeenCalledWith({ userId: USER_B, date: '2026-07-20' })
  })
})

describe('POST /api/journal (reading log) — contract unchanged', () => {
  it('still requires a book title and at least 10 pages', async () => {
    expect((await POST(postReq({ bookTitle: '', pagesRead: 20 }))).status).toBe(400)
    expect((await POST(postReq({ bookTitle: 'Deep Work', pagesRead: 9 }))).status).toBe(400)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('upserts the reading fields for the logical today and recomputes the spine', async () => {
    const res = await POST(postReq({ bookTitle: ' Deep Work ', pagesRead: 24, notes: 'ch2' }))
    expect(res.status).toBe(201)

    const [filter, update] = findOneAndUpdate.mock.calls[0]
    expect(filter).toEqual({ userId: USER_A, date: TODAY })
    // An explicit $set, never a replacement document — a replacement would wipe
    // the reflection half of the same row.
    expect(update).toEqual({ $set: { bookTitle: 'Deep Work', pagesRead: 24, notes: 'ch2' } })
    expect(recomputeDailyLog).toHaveBeenCalledWith(USER_A, TODAY, undefined, expect.any(Function))
  })

  it('does not write any reflection field', async () => {
    await POST(postReq({ bookTitle: 'Deep Work', pagesRead: 24, mood: 'great', reflection: 'x' }))
    const [, update] = findOneAndUpdate.mock.calls[0]
    expect(Object.keys(update.$set).sort()).toEqual(['bookTitle', 'notes', 'pagesRead'])
    expect(update.$set).not.toHaveProperty('mood')
    expect(update.$set).not.toHaveProperty('reflection')
  })
})
