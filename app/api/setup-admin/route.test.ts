import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// setup-admin performs the first-admin bootstrap. It must be impossible for an
// ordinary authenticated user to promote themselves: promotion requires a
// dedicated server-only secret (ADMIN_BOOTSTRAP_SECRET) supplied via the
// Authorization header, is only usable while zero admins exist, and reveals
// nothing about which check failed.

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

function req(opts: { authorization?: string; query?: string } = {}) {
  const headers = new Headers()
  if (opts.authorization !== undefined) headers.set('authorization', opts.authorization)
  const url = `http://localhost/api/setup-admin${opts.query ?? ''}`
  return new Request(url, { method: 'POST', headers }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  findOne.mockReset()
  updateOne.mockReset()

  auth.mockResolvedValue({ user: { email: 'owner@example.com' } })
  findOne.mockResolvedValue(null) // no admin exists yet
  updateOne.mockResolvedValue({ modifiedCount: 1 })
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/setup-admin — authentication', () => {
  it('401 when there is no session email', async () => {
    auth.mockResolvedValue({ user: {} })
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    const res = await POST(req({ authorization: 'Bearer boot' }))
    expect(res.status).toBe(401)
    expect(updateOne).not.toHaveBeenCalled()
  })
})

describe('POST /api/setup-admin — bootstrap secret required', () => {
  it('403 when ADMIN_BOOTSTRAP_SECRET is not configured (endpoint disabled)', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', undefined)
    const res = await POST(req({ authorization: 'Bearer undefined' }))
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('403 when ADMIN_BOOTSTRAP_SECRET is empty', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', '')
    const res = await POST(req({ authorization: 'Bearer ' }))
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('403 for the wrong secret', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    const res = await POST(req({ authorization: 'Bearer wrong' }))
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('403 for a malformed header (no Bearer prefix)', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    const res = await POST(req({ authorization: 'boot' }))
    expect(res.status).toBe(403)
  })

  it('403 when the secret is supplied only as a query parameter, not the header', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    const res = await POST(req({ query: '?secret=boot' }))
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('never echoes the secret in the response body', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    const res = await POST(req({ authorization: 'Bearer wrong' }))
    const body = JSON.stringify(await res.json())
    expect(body).not.toContain('boot')
  })
})

describe('POST /api/setup-admin — zero-admins guard (with valid secret)', () => {
  it('403 (generic — does not reveal admin state) when an admin already exists', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    findOne.mockResolvedValue({ role: 'admin' })
    const res = await POST(req({ authorization: 'Bearer boot' }))
    expect(res.status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })
})

describe('POST /api/setup-admin — successful bootstrap', () => {
  it('promotes the session user (querying by normalized email) with a valid secret and no existing admin', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_SECRET', 'boot')
    auth.mockResolvedValue({ user: { email: '  Owner@Example.COM ' } })
    const res = await POST(req({ authorization: 'Bearer boot' }))
    expect(res.status).toBe(200)
    expect(updateOne).toHaveBeenCalledWith(
      { email: 'owner@example.com' },
      { $set: { role: 'admin' } }
    )
  })
})
