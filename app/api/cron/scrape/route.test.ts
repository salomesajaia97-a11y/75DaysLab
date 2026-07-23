import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The cron scrape endpoint is protected by a shared Bearer secret (CRON_SECRET).
// It must deny every request unless the secret is configured AND the header
// matches it in constant time — an unset secret must NOT be satisfiable by a
// literal `Authorization: Bearer undefined`.

const { connectDB, findOne, create, getUrls, scrapePage, delay, scrapeRetailers } = vi.hoisted(
  () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
    findOne: vi.fn(),
    create: vi.fn(),
    getUrls: vi.fn(),
    scrapePage: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
    scrapeRetailers: vi.fn(),
  })
)

vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Recipe', () => ({ Recipe: { findOne, create } }))
vi.mock('@/lib/scrapers', () => ({
  getRecipeUrlsSkinnyTaste: getUrls,
  scrapeRecipePage: scrapePage,
  delay,
}))
vi.mock('@/lib/grocery', () => ({ scrapeAllRetailers: scrapeRetailers }))

import { GET } from './route'

function req(authorization?: string): Request {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return new Request('http://localhost/api/cron/scrape', { headers })
}

beforeEach(() => {
  connectDB.mockClear()
  getUrls.mockReset().mockResolvedValue([]) // no candidate URLs → no scraping work
  scrapeRetailers.mockReset().mockResolvedValue([])
  findOne.mockReset()
  create.mockReset()
  scrapePage.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/cron/scrape — Bearer secret auth', () => {
  it('401 when CRON_SECRET is not set, even with "Bearer undefined"', async () => {
    vi.stubEnv('CRON_SECRET', undefined)
    const res = await GET(req('Bearer undefined'))
    expect(res.status).toBe(401)
    expect(connectDB).not.toHaveBeenCalled()
  })

  it('401 when CRON_SECRET is empty', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(req('Bearer '))
    expect(res.status).toBe(401)
    expect(connectDB).not.toHaveBeenCalled()
  })

  it('401 when the Authorization header is missing', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret')
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('401 for a malformed header (no Bearer prefix)', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret')
    const res = await GET(req('topsecret'))
    expect(res.status).toBe(401)
  })

  it('401 for the wrong secret', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret')
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('proceeds (200) for the correct secret', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret')
    const res = await GET(req('Bearer topsecret'))
    expect(res.status).toBe(200)
    expect(connectDB).toHaveBeenCalled()
  })

  it('never echoes the secret in the response body', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret')
    const res = await GET(req('Bearer wrong'))
    const body = JSON.stringify(await res.json())
    expect(body).not.toContain('topsecret')
  })
})
