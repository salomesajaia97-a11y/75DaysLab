import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The history GET handler derives the live day via resolveLogicalToday, builds a
// trailing date window, and reads (NEVER recomputes) the DailyLogs in it. Auth,
// connectDB, resolveLogicalToday and the DailyLog model are mocked; the real pure
// helpers (addDays / summarizeDay) run so the window + classification are
// exercised end to end. There is deliberately no recompute import to mock — past
// days are read-only.

const { auth, connectDB, resolveLogicalToday, dailyFind } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  resolveLogicalToday: vi.fn(),
  dailyFind: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/models/DailyLog', () => ({ DailyLog: { find: dailyFind } }))

import { GET } from './route'

const VALID_USER_ID = '507f1f77bcf86cd799439011'
const LOGICAL_TODAY = '2026-07-25'

function makeGet(search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/daily-progress/history${search}`)
}

/** Mock DailyLog.find(...).select(...).lean() resolving to `docs`. */
function mockLogs(docs: unknown[]) {
  dailyFind.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(docs) }) })
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: VALID_USER_ID } })
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(LOGICAL_TODAY)
  dailyFind.mockReset()
  mockLogs([])
})

describe('GET /api/daily-progress/history', () => {
  it('401s without a valid session', async () => {
    auth.mockResolvedValueOnce(null)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
    expect(dailyFind).not.toHaveBeenCalled()
  })

  it('returns a 7-day window (newest first) ending today by default', async () => {
    const res = await GET(makeGet())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.today).toBe(LOGICAL_TODAY)
    expect(body.history).toHaveLength(7)
    expect(body.history[0].date).toBe('2026-07-25')
    expect(body.history[6].date).toBe('2026-07-19')
  })

  it('classifies recorded days and marks missing days as no-record', async () => {
    mockLogs([
      // perfect day
      { date: '2026-07-25', waterCompleted: true, journalCompleted: true, nutritionCompleted: true, workoutCompleted: true, photoUploaded: true },
      // completed (3/5)
      { date: '2026-07-24', waterCompleted: true, journalCompleted: true, nutritionCompleted: true },
      // incomplete (2/5)
      { date: '2026-07-23', waterCompleted: true, journalCompleted: true },
    ])
    const res = await GET(makeGet())
    const { history } = await res.json()
    const byDate = Object.fromEntries(history.map((h: { date: string }) => [h.date, h]))

    expect(byDate['2026-07-25']).toMatchObject({ hasRecord: true, completedTaskCount: 5, percent: 100, status: 'perfect' })
    expect(byDate['2026-07-24']).toMatchObject({ hasRecord: true, completedTaskCount: 3, percent: 60, status: 'completed' })
    expect(byDate['2026-07-23']).toMatchObject({ hasRecord: true, completedTaskCount: 2, percent: 40, status: 'incomplete' })
    // a day with no doc
    expect(byDate['2026-07-20']).toMatchObject({ hasRecord: false, completedTaskCount: 0, percent: 0 })
  })

  it('honors ?days= and clamps it to [1, 31]', async () => {
    expect((await (await GET(makeGet('?days=3'))).json()).history).toHaveLength(3)
    expect((await (await GET(makeGet('?days=999'))).json()).history).toHaveLength(31)
    expect((await (await GET(makeGet('?days=0'))).json()).history).toHaveLength(1)
    expect((await (await GET(makeGet('?days=abc'))).json()).history).toHaveLength(7)
  })

  it('queries only the requested user and window dates', async () => {
    await GET(makeGet('?days=2'))
    expect(dailyFind).toHaveBeenCalledWith({
      userId: VALID_USER_ID,
      date: { $in: ['2026-07-25', '2026-07-24'] },
    })
  })
})
