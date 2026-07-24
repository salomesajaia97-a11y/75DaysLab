import { describe, it, expect, vi, beforeEach } from 'vitest'

// The nutrition-week GET handler builds a 7-day calorie window. It now anchors
// that window on the canonical logical "today" (resolveLogicalToday) and steps
// calendar days with the shared, tested addDays helper — no raw UTC derivation.
// resolveLogicalToday is mocked; addDays runs for real so the stepping is
// exercised end to end.

const { auth, connectDB, aggregate, resolveLogicalToday } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  aggregate: vi.fn(),
  resolveLogicalToday: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/FoodLog', () => ({ FoodLog: { aggregate } }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))

import { GET } from './route'

const VALID_USER_ID = '507f1f77bcf86cd799439011'
const LOGICAL_TODAY = '2026-07-15'
// Inclusive 7-day window ending on the logical today, oldest first.
const EXPECTED_WINDOW = [
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-12',
  '2026-07-13',
  '2026-07-14',
  '2026-07-15',
]

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: VALID_USER_ID } })
  connectDB.mockClear()
  aggregate.mockReset().mockResolvedValue([])
  resolveLogicalToday.mockReset().mockResolvedValue(LOGICAL_TODAY)
})

describe('GET /api/nutrition/week — logical-today anchored window', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(resolveLogicalToday).not.toHaveBeenCalled()
  })

  it('queries the 7-day window ending on the canonical logical today', async () => {
    await GET()
    expect(resolveLogicalToday).toHaveBeenCalledWith(VALID_USER_ID)
    const matchStage = aggregate.mock.calls[0][0][0]
    expect(matchStage.$match.date.$in).toEqual(EXPECTED_WINDOW)
  })

  it('returns one entry per window day, oldest first, with missing days as 0', async () => {
    aggregate.mockResolvedValue([
      { _id: '2026-07-15', calories: 1800 },
      { _id: '2026-07-13', calories: 2100 },
    ])
    const res = await GET()
    const { days } = await res.json()
    expect(days.map((d: { date: string }) => d.date)).toEqual(EXPECTED_WINDOW)
    expect(days.find((d: { date: string }) => d.date === '2026-07-15').calories).toBe(1800)
    expect(days.find((d: { date: string }) => d.date === '2026-07-13').calories).toBe(2100)
    expect(days.find((d: { date: string }) => d.date === '2026-07-09').calories).toBe(0)
  })
})
