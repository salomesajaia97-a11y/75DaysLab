import { describe, it, expect, vi, beforeEach } from 'vitest'

// setup-admin promotes the current session's user to admin by an email query.
// That query must use the normalized (trimmed + lowercased) email so it matches
// the canonical stored form regardless of the session email's casing.

const { auth, connectDB, findOne, updateOne } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  findOne: vi.fn(),
  updateOne: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/User', () => ({ User: { findOne, updateOne } }))

import { POST } from './route'

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  findOne.mockReset()
  updateOne.mockReset()

  findOne.mockResolvedValue(null) // no admin exists yet
  updateOne.mockResolvedValue({ modifiedCount: 1 })
})

describe('POST /api/setup-admin — email normalization', () => {
  it('queries by the normalized email when the session email has mixed case / spaces', async () => {
    auth.mockResolvedValue({ user: { email: '  Admin@Example.COM ' } })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(updateOne).toHaveBeenCalledWith(
      { email: 'admin@example.com' },
      { $set: { role: 'admin' } }
    )
  })

  it('returns 401 when there is no session email', async () => {
    auth.mockResolvedValue({ user: {} })
    const res = await POST()
    expect(res.status).toBe(401)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('returns 403 when an admin already exists', async () => {
    auth.mockResolvedValue({ user: { email: 'admin@example.com' } })
    findOne.mockResolvedValue({ role: 'admin' })
    const res = await POST()
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })
})
