import { describe, it, expect, vi, beforeEach } from 'vitest'

// The onboarding route persists the user's selected challenge length. It must
// enforce the server-side whitelist (30/40/55/75) and NEVER silently coerce an
// invalid value to a default. The DB layer is mocked so this runs without Mongo.

const { auth, connectDB, findByIdAndUpdate, findOneAndUpdate } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/User', () => ({ User: { findByIdAndUpdate } }))
vi.mock('@/models/Challenge', () => ({ Challenge: { findOneAndUpdate } }))

import { POST } from './route'

function req(body: unknown): import('next/server').NextRequest {
  return new Request('http://localhost/api/users/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

const goodBody = (over: Record<string, unknown> = {}) => ({
  age: 30,
  gender: 'female',
  heightCm: 170,
  weightKg: 65,
  goal: 'fitness',
  focusArea: 'core',
  startDate: '2026-07-23',
  totalDays: 75,
  ...over,
})

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  findByIdAndUpdate.mockReset()
  findOneAndUpdate.mockReset()

  auth.mockResolvedValue({ user: { id: '507f1f77bcf86cd799439011' } })
  // chainable .catch() on the User update, matching the route's usage
  findByIdAndUpdate.mockReturnValue({
    catch: () => Promise.resolve({ _id: '507f1f77bcf86cd799439011', username: 'qa' }),
  })
  findOneAndUpdate.mockImplementation((_q: unknown, doc: { totalDays: number; startDate: Date }) =>
    Promise.resolve({ ...doc, startDate: doc.startDate })
  )
})

describe('POST /api/users/onboarding — challenge length validation', () => {
  for (const len of [30, 40, 55, 75]) {
    it(`accepts the supported length ${len} and persists it`, async () => {
      const res = await POST(req(goodBody({ totalDays: len })))
      expect(res.status).toBe(200)
      const persisted = findOneAndUpdate.mock.calls[0][1] as { totalDays: number }
      expect(persisted.totalDays).toBe(len)
    })
  }

  it('accepts a numeric-string length and persists it as a number', async () => {
    const res = await POST(req(goodBody({ totalDays: '40' })))
    expect(res.status).toBe(200)
    const persisted = findOneAndUpdate.mock.calls[0][1] as { totalDays: number }
    expect(persisted.totalDays).toBe(40)
  })

  for (const bad of [50, 76, 29, 0, -75, 100, 365, 75.5]) {
    it(`rejects unsupported length ${bad} with 400 and writes no challenge`, async () => {
      const res = await POST(req(goodBody({ totalDays: bad })))
      expect(res.status).toBe(400)
      expect(findOneAndUpdate).not.toHaveBeenCalled()
    })
  }

  it('rejects a missing length instead of defaulting to 75', async () => {
    const body = goodBody()
    delete (body as Record<string, unknown>).totalDays
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('rejects a garbage length string with 400', async () => {
    const res = await POST(req(goodBody({ totalDays: 'seventy-five' })))
    expect(res.status).toBe(400)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(req(goodBody()))
    expect(res.status).toBe(401)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })
})
