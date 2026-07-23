import { describe, it, expect, vi, beforeEach } from 'vitest'

// GET /api/recipes is an authenticated, bounded, safe-shape recipe list. It must
// require a session, escape user-controlled regex input, validate pagination,
// and never expose internal Mongoose fields or heavy arrays.

const { auth, connectDB, find } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  find: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Recipe', () => ({ Recipe: { find } }))

import { GET } from './route'

function mockFindChain(rows: unknown[]) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(rows),
  }
  find.mockReturnValue(chain)
  return chain
}

function req(query = '') {
  return new Request(`http://localhost/api/recipes${query}`) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: 'u1' } })
  connectDB.mockClear()
  find.mockReset()
  mockFindChain([])
})

describe('GET /api/recipes — auth', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(find).not.toHaveBeenCalled()
  })

  it('200 for an authenticated request', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ recipes: [], total: 0 })
  })
})

describe('GET /api/recipes — regex safety', () => {
  it('escapes regex metacharacters in the category filter', async () => {
    await GET(req('?category=' + encodeURIComponent('a.*b')))
    const filter = find.mock.calls[0][0] as { category: { $regex: string } }
    expect(filter.category.$regex).toBe('a\\.\\*b')
  })
})

describe('GET /api/recipes — pagination validation', () => {
  it('400 for a malformed limit', async () => {
    const res = await GET(req('?limit=abc'))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })

  it('400 for an excessive limit', async () => {
    const res = await GET(req('?limit=100000'))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })

  it('400 for a malformed / non-positive page', async () => {
    const res = await GET(req('?page=-3'))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })

  it('applies a default bounded limit when none is given', async () => {
    const chain = mockFindChain([])
    await GET(req())
    expect(chain.limit).toHaveBeenCalledWith(100)
  })

  it('ignores non-finite numeric filters instead of injecting NaN', async () => {
    await GET(req('?maxCal=notanumber'))
    const filter = find.mock.calls[0][0] as Record<string, unknown>
    expect(filter.calories).toBeUndefined()
  })
})

describe('GET /api/recipes — safe response shape', () => {
  it('projects to a field allowlist and never returns internal Mongoose fields', async () => {
    await GET(req())
    const projection = find.mock.calls[0][1] as string
    expect(projection).not.toMatch(/__v|ingredients|instructions/)
    expect(projection).toMatch(/title/)
  })

  it('does not leak __v / ingredients / instructions in the serialized body', async () => {
    mockFindChain([{ _id: 'r1', title: 'Soup', calories: 100 }])
    const res = await GET(req())
    const serialized = JSON.stringify(await res.json())
    expect(serialized).not.toMatch(/__v|ingredients|instructions/)
  })
})
