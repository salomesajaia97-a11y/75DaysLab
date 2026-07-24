import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The water GET handler defaults its query day to the canonical logical "today"
// (via resolveLogicalToday) rather than a raw UTC key, while an explicit ?date=
// browse key still passes straight through unchanged. This test mocks the shared
// helper so the read endpoint's date-selection contract is asserted in isolation.

const { auth, connectDB, find, resolveLogicalToday } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  find: vi.fn(),
  resolveLogicalToday: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/WaterLog', () => ({ WaterLog: { find, create: vi.fn() } }))
vi.mock('@/lib/recompute-daily-log', () => ({ recomputeDailyLog: vi.fn() }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))

import { GET } from './route'

const VALID_USER_ID = '507f1f77bcf86cd799439011'
const LOGICAL_TODAY = '2026-07-15'

function makeGet(search = ''): NextRequest {
  return new NextRequest(`http://localhost/api/water${search}`)
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: VALID_USER_ID } })
  connectDB.mockClear()
  find.mockReset().mockResolvedValue([{ amountMl: 250 }, { amountMl: 500 }])
  resolveLogicalToday.mockReset().mockResolvedValue(LOGICAL_TODAY)
})

describe('GET /api/water — logical-today default', () => {
  it('401 when unauthenticated (never touches the DB)', async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
    expect(find).not.toHaveBeenCalled()
    expect(resolveLogicalToday).not.toHaveBeenCalled()
  })

  it('defaults an omitted date to the canonical logical today', async () => {
    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    expect(resolveLogicalToday).toHaveBeenCalledWith(VALID_USER_ID)
    expect(find).toHaveBeenCalledWith({ userId: VALID_USER_ID, date: LOGICAL_TODAY })
  })

  it('honors an explicit ?date= browse key unchanged (query semantics preserved)', async () => {
    await GET(makeGet('?date=2026-01-01'))
    expect(find).toHaveBeenCalledWith({ userId: VALID_USER_ID, date: '2026-01-01' })
  })

  it('returns the summed total for the resolved day', async () => {
    const res = await GET(makeGet())
    expect(await res.json()).toEqual({ totalMl: 750, logs: [{ amountMl: 250 }, { amountMl: 500 }] })
  })
})
