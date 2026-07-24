import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The daily-progress GET handler derives the live day via the canonical
// resolveLogicalToday, then validates a client-supplied ?date=: malformed or
// FUTURE keys are rejected before any query, and the live day triggers a
// self-heal recompute while past days are read-only. resolveLogicalToday and the
// models are mocked; the real lib/progress validators (isValidDayString /
// isFutureDay) run so the future-date guard is exercised end to end.

const { auth, connectDB, resolveLogicalToday, recomputeDailyLog, userFindById, dailyFindOne, dailyCount, waterFind, challengeFindOne } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    connectDB: vi.fn().mockResolvedValue(undefined),
    resolveLogicalToday: vi.fn(),
    recomputeDailyLog: vi.fn(),
    userFindById: vi.fn(),
    dailyFindOne: vi.fn(),
    dailyCount: vi.fn(),
    waterFind: vi.fn(),
    challengeFindOne: vi.fn(),
  }))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/lib/recompute-daily-log', () => ({ recomputeDailyLog }))
vi.mock('@/models/User', () => ({ User: { findById: userFindById } }))
vi.mock('@/models/DailyLog', () => ({ DailyLog: { findOne: dailyFindOne, countDocuments: dailyCount } }))
vi.mock('@/models/WaterLog', () => ({ WaterLog: { find: waterFind } }))
vi.mock('@/models/Challenge', () => ({ Challenge: { findOne: challengeFindOne } }))

import { GET } from './route'

const VALID_USER_ID = '507f1f77bcf86cd799439011'
const LOGICAL_TODAY = '2026-07-15'

function makeGet(search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/daily-progress${search}`)
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: VALID_USER_ID } })
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(LOGICAL_TODAY)
  recomputeDailyLog.mockReset().mockResolvedValue({ log: {}, challenge: null })
  // Minimal loaded context — no user/challenge, empty logs.
  userFindById.mockReset().mockReturnValue({ select: vi.fn().mockReturnValue(null) })
  dailyFindOne.mockReset().mockResolvedValue(null)
  dailyCount.mockReset().mockResolvedValue(0)
  waterFind.mockReset().mockResolvedValue([])
  challengeFindOne.mockReset().mockResolvedValue(null)
})

describe('GET /api/daily-progress — read-side logical day & future-date guard', () => {
  it('rejects a future date with 400 (never reads the future)', async () => {
    const res = await GET(makeGet('?date=2026-07-16'))
    expect(res.status).toBe(400)
    expect(dailyFindOne).not.toHaveBeenCalled()
    expect(recomputeDailyLog).not.toHaveBeenCalled()
  })

  it('rejects a malformed date with 400', async () => {
    const res = await GET(makeGet('?date=not-a-date'))
    expect(res.status).toBe(400)
    expect(dailyFindOne).not.toHaveBeenCalled()
  })

  it('defaults an omitted date to the logical today and self-heals it', async () => {
    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    expect(resolveLogicalToday).toHaveBeenCalledWith(VALID_USER_ID, expect.any(Function))
    expect(dailyFindOne).toHaveBeenCalledWith({ userId: VALID_USER_ID, date: LOGICAL_TODAY })
    expect(recomputeDailyLog).toHaveBeenCalledWith(VALID_USER_ID, LOGICAL_TODAY, undefined, expect.any(Function))
  })

  it('accepts an explicit past date and does NOT self-heal it (read-only)', async () => {
    const res = await GET(makeGet('?date=2026-07-01'))
    expect(res.status).toBe(200)
    expect(dailyFindOne).toHaveBeenCalledWith({ userId: VALID_USER_ID, date: '2026-07-01' })
    expect(recomputeDailyLog).not.toHaveBeenCalled()
  })
})
