import { describe, it, expect, vi, beforeEach } from 'vitest'

// Scenario D — malformed registration must 400 and create NO database user.
// The DB layer is mocked so this runs without Mongo; the assertions prove the
// route rejects bad input BEFORE any user is created.

const { findOne, create, connectDB } = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/User', () => ({ User: { findOne, create } }))

import { POST } from './route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  findOne.mockReset()
  create.mockReset()
  connectDB.mockClear()
})

describe('POST /api/auth/register — validation', () => {
  it('rejects a malformed email with 400 and creates no user', async () => {
    const res = await POST(req({ username: 'qa-invalid-email', email: 'not-an-email', password: 'password123' }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
  })

  it('rejects a missing email with 400 and creates no user', async () => {
    const res = await POST(req({ username: 'bob', password: 'password123' }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only email with 400', async () => {
    const res = await POST(req({ username: 'bob', email: '   ', password: 'password123' }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a short password with 400 and creates no user', async () => {
    const res = await POST(req({ username: 'bob', email: 'bob@example.com', password: 'x' }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('normalizes email + checks uniqueness with the normalized value, then creates', async () => {
    findOne.mockResolvedValue(null)
    create.mockResolvedValue({ _id: 'abc123', username: 'Bob', email: 'bob@example.com' })

    const res = await POST(req({ username: '  Bob ', email: '  Bob@Example.COM ', password: 'password123' }))
    expect(res.status).toBe(201)
    // uniqueness query used the normalized (trimmed + lowercased) email
    expect(findOne).toHaveBeenCalledWith({ $or: [{ email: 'bob@example.com' }, { username: 'Bob' }] })
    // created user stores the normalized values (no password echoed in response)
    const created = create.mock.calls[0][0]
    expect(created.email).toBe('bob@example.com')
    expect(created.username).toBe('Bob')
    expect(created.passwordHash).toBeTypeOf('string')
    expect(created.password).toBeUndefined()
  })

  it('returns 409 for a duplicate normalized email', async () => {
    findOne.mockResolvedValue({ email: 'bob@example.com', username: 'other' })
    const res = await POST(req({ username: 'bob', email: 'BOB@EXAMPLE.COM', password: 'password123' }))
    expect(res.status).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })
})
