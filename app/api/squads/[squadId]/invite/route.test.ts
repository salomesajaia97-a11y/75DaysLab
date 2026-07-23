import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'

// Joining by invite code must (a) trust only the server session for identity,
// and (b) never create a duplicate membership when an existing member re-joins.

const { auth, connectDB, findOne } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  findOne: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Squad', () => ({ Squad: { findOne } }))

import { POST } from './route'

const USER = '507f1f77bcf86cd799439011'

function req(body: unknown) {
  return new Request('http://localhost/api/squads/x/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER } })
  connectDB.mockClear()
  findOne.mockReset()
})

describe('POST /api/squads/[squadId]/invite', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(req({ code: 'ABC123' }))
    expect(res.status).toBe(401)
  })

  it('400 when the invite code is missing', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('404 when no squad matches the code', async () => {
    findOne.mockResolvedValue(null)
    const res = await POST(req({ code: 'NOPE' }))
    expect(res.status).toBe(404)
  })

  it('adds the session user once when joining a new squad', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const squad = { members: [] as mongoose.Types.ObjectId[], save }
    findOne.mockResolvedValue(squad)
    const res = await POST(req({ code: 'ABC123' }))
    expect(res.status).toBe(200)
    expect(squad.members).toHaveLength(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('does NOT duplicate membership when an existing member re-joins', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const squad = {
      members: [new mongoose.Types.ObjectId(USER)],
      save,
    }
    findOne.mockResolvedValue(squad)
    const res = await POST(req({ code: 'ABC123' }))
    expect(res.status).toBe(200)
    expect(squad.members).toHaveLength(1)
    expect(save).not.toHaveBeenCalled()
  })
})
