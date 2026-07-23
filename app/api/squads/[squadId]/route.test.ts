import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'

// A squad and its members' usernames must only be readable by a member. A
// non-member — or a request for a nonexistent / malformed id — must receive an
// identical generic 404 so squad existence is never confirmed to outsiders.

const { auth, connectDB, findOne, findById } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  findOne: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Squad', () => ({ Squad: { findOne, findById } }))

import { GET, DELETE } from './route'

const USER = '507f1f77bcf86cd799439011'
const SQUAD = '507f191e810c19729de860ea'

function ctx(squadId: string) {
  return { params: Promise.resolve({ squadId }) }
}
function req() {
  return new Request('http://localhost/api/squads/x') as unknown as import('next/server').NextRequest
}

/** Squad.findOne(...).populate('members','username') → resolves `value`. */
function mockFindOne(value: unknown) {
  findOne.mockReturnValue({ populate: vi.fn().mockResolvedValue(value) })
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER } })
  connectDB.mockClear()
  findOne.mockReset()
  findById.mockReset()
})

describe('GET /api/squads/[squadId] — access control', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await GET(req(), ctx(SQUAD))
    expect(res.status).toBe(401)
    expect(findOne).not.toHaveBeenCalled()
  })

  it('404 for a malformed squad id (never reaches the DB)', async () => {
    const res = await GET(req(), ctx('not-a-valid-objectid'))
    expect(res.status).toBe(404)
    expect(findOne).not.toHaveBeenCalled()
  })

  it('scopes the query to the requester so membership is enforced in the DB', async () => {
    mockFindOne(null)
    await GET(req(), ctx(SQUAD))
    expect(findOne).toHaveBeenCalledWith({ _id: SQUAD, members: USER })
  })

  it('404 for a nonexistent squad', async () => {
    mockFindOne(null)
    const res = await GET(req(), ctx(SQUAD))
    expect(res.status).toBe(404)
  })

  it('404 (generic — same as nonexistent) when the requester is not a member', async () => {
    // The member-scoped query returns null for a non-member; the handler must
    // not fall back to an unscoped lookup.
    mockFindOne(null)
    const res = await GET(req(), ctx(SQUAD))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toMatch(/username|members/)
  })

  it('200 and returns the squad for a member', async () => {
    mockFindOne({ _id: SQUAD, name: 'Crew', members: [{ username: 'me' }] })
    const res = await GET(req(), ctx(SQUAD))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Crew')
  })
})

describe('DELETE /api/squads/[squadId] — owner only', () => {
  it('404 for a malformed id', async () => {
    const res = await DELETE(req(), ctx('bad'))
    expect(res.status).toBe(404)
    expect(findById).not.toHaveBeenCalled()
  })

  it('404 for a nonexistent squad', async () => {
    findById.mockResolvedValue(null)
    const res = await DELETE(req(), ctx(SQUAD))
    expect(res.status).toBe(404)
  })

  it('403 when the requester is not the creator', async () => {
    findById.mockResolvedValue({
      creatorId: new mongoose.Types.ObjectId(),
      deleteOne: vi.fn(),
    })
    const res = await DELETE(req(), ctx(SQUAD))
    expect(res.status).toBe(403)
  })

  it('200 and deletes when the requester is the creator', async () => {
    const deleteOne = vi.fn().mockResolvedValue(undefined)
    findById.mockResolvedValue({ creatorId: { toString: () => USER }, deleteOne })
    const res = await DELETE(req(), ctx(SQUAD))
    expect(res.status).toBe(200)
    expect(deleteOne).toHaveBeenCalled()
  })
})
