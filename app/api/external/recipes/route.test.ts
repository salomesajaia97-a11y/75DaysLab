import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The external ingest endpoint is protected by SCRAPER_SECRET. An unset secret
// must never be satisfied by "Bearer undefined".

const { connectDB, findOne, create, classify } = vi.hoisted(() => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  findOne: vi.fn(),
  create: vi.fn(),
  classify: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Recipe', () => ({ Recipe: { findOne, create } }))
vi.mock('@/lib/classify', () => ({ classifyRecipe: classify }))

import { POST } from './route'

function req(authorization: string | undefined, body: unknown = { title: 't', sourceUrl: 'u', sourceSite: 'skinnytaste' }) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (authorization !== undefined) headers.set('authorization', authorization)
  return new Request('http://localhost/api/external/recipes', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  connectDB.mockClear()
  findOne.mockReset().mockResolvedValue(null)
  create.mockReset().mockResolvedValue({})
  classify.mockClear()
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/external/recipes — Bearer secret auth', () => {
  it('401 when SCRAPER_SECRET is unset, even with "Bearer undefined"', async () => {
    vi.stubEnv('SCRAPER_SECRET', undefined)
    const res = await POST(req('Bearer undefined'))
    expect(res.status).toBe(401)
    expect(connectDB).not.toHaveBeenCalled()
  })

  it('401 when SCRAPER_SECRET is empty', async () => {
    vi.stubEnv('SCRAPER_SECRET', '')
    const res = await POST(req('Bearer '))
    expect(res.status).toBe(401)
  })

  it('401 for the wrong secret', async () => {
    vi.stubEnv('SCRAPER_SECRET', 'sekret')
    const res = await POST(req('Bearer nope'))
    expect(res.status).toBe(401)
  })

  it('proceeds for the correct secret', async () => {
    vi.stubEnv('SCRAPER_SECRET', 'sekret')
    const res = await POST(req('Bearer sekret'))
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalled()
  })
})
