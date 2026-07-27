import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The history GET builds a trailing window ending on the canonical logical
// today and reads (never writes) the authenticated user's journal entries.
// Auth, connectDB, resolveLogicalToday and the model are mocked; the real pure
// helpers (addDays, clampHistoryDays, previews) run.

const { auth, connectDB, resolveLogicalToday, find } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  resolveLogicalToday: vi.fn(),
  find: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/lib/logical-day-context', () => ({ resolveLogicalToday }))
vi.mock('@/models/JournalEntry', () => ({ JournalEntry: { find } }))

import { GET } from './route'

const USER_A = '507f1f77bcf86cd799439011'
const USER_B = '507f1f77bcf86cd799439099'
const TODAY = '2026-07-27'

/** Mock the `.select().sort().limit().lean()` chain resolving to `docs`. */
function mockDocs(docs: unknown[]) {
  find.mockReturnValue({
    select: () => ({
      sort: () => ({ limit: () => ({ lean: () => Promise.resolve(docs) }) }),
    }),
  })
}

const req = (search = '') => new NextRequest(`http://localhost/api/journal/history${search}`)

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER_A } })
  connectDB.mockClear()
  resolveLogicalToday.mockReset().mockResolvedValue(TODAY)
  find.mockReset()
  mockDocs([])
})

describe('GET /api/journal/history', () => {
  it('401s without a valid session', async () => {
    auth.mockResolvedValueOnce(null)
    expect((await GET(req())).status).toBe(401)
    expect(find).not.toHaveBeenCalled()
  })

  it('queries a 30-day trailing window ending on the logical today by default', async () => {
    const body = await (await GET(req())).json()
    expect(find).toHaveBeenCalledWith({
      userId: USER_A,
      date: { $gte: '2026-06-28', $lte: TODAY },
    })
    expect(body).toMatchObject({ today: TODAY, from: '2026-06-28', to: TODAY, days: 30 })
  })

  it('honors ?days= and clamps it to [1, 180]', async () => {
    await GET(req('?days=7'))
    expect(find.mock.calls[0][0].date.$gte).toBe('2026-07-21')
    expect((await (await GET(req('?days=9999'))).json()).days).toBe(180)
    expect((await (await GET(req('?days=0'))).json()).days).toBe(1)
    expect((await (await GET(req('?days=abc'))).json()).days).toBe(30)
  })

  it('only ever queries the AUTHENTICATED user', async () => {
    auth.mockResolvedValue({ user: { id: USER_B } })
    await GET(req(`?userId=${USER_A}`))
    expect(find.mock.calls[0][0].userId).toBe(USER_B)
    expect(JSON.stringify(find.mock.calls[0][0])).not.toContain(USER_A)
  })

  it('maps entries to date + mood + title + preview', async () => {
    mockDocs([
      { date: '2026-07-26', mood: 'good', title: 'Solid', reflection: 'Trained   early.\nAte well.' },
      { date: '2026-07-25', mood: 'low', title: '', reflection: '', gratitude: 'Family' },
    ])
    const { entries } = await (await GET(req())).json()
    expect(entries).toEqual([
      { date: '2026-07-26', mood: 'good', title: 'Solid', preview: 'Trained early. Ate well.' },
      { date: '2026-07-25', mood: 'low', title: '', preview: 'Family' },
    ])
  })

  it('omits rows that only hold a reading log (not a reflection)', async () => {
    mockDocs([
      { date: '2026-07-26', bookTitle: 'Deep Work', pagesRead: 24 },
      { date: '2026-07-25', mood: 'great' },
    ])
    const { entries } = await (await GET(req())).json()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ date: '2026-07-25', mood: 'great' })
  })

  it('returns an empty list (not an error) when there is no history', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect((await res.json()).entries).toEqual([])
  })

  it('returns a safe error and leaks nothing when the read throws', async () => {
    find.mockImplementation(() => {
      throw new Error('MongoNetworkError mongodb+srv://user:pw@cluster')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.code).toBe('read_failed')
    expect(JSON.stringify(body)).not.toContain('mongodb+srv')
  })
})
