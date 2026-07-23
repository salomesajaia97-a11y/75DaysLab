import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The reclassify endpoint is protected by SCRAPER_SECRET. An unset secret must
// never be satisfied by "Bearer undefined".

const { connectDB, find, updateOne, classify } = vi.hoisted(() => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  find: vi.fn(),
  updateOne: vi.fn(),
  classify: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Recipe', () => ({ Recipe: { find, updateOne } }))
vi.mock('@/lib/classify', () => ({ classifyRecipe: classify }))

import { POST } from './route'

// find({}, ...).lean().cursor() must yield an async-iterable of docs.
function mockCursor(docs: unknown[]) {
  find.mockReturnValue({
    lean: () => ({
      cursor: () => ({
        async *[Symbol.asyncIterator]() {
          for (const d of docs) yield d
        },
      }),
    }),
  })
}

function req(authorization: string | undefined) {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return new Request('http://localhost/api/recipes/reclassify', {
    method: 'POST',
    headers,
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  connectDB.mockClear()
  updateOne.mockReset().mockResolvedValue({})
  classify.mockClear()
  mockCursor([])
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/recipes/reclassify — Bearer secret auth', () => {
  it('401 when SCRAPER_SECRET is unset, even with "Bearer undefined"', async () => {
    vi.stubEnv('SCRAPER_SECRET', undefined)
    const res = await POST(req('Bearer undefined'))
    expect(res.status).toBe(401)
    expect(connectDB).not.toHaveBeenCalled()
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
    expect(connectDB).toHaveBeenCalled()
  })
})
