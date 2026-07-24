import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { DEFAULT_TIME_ZONE } from '@/lib/date-key'

// Phase 2D-5: onboarding activates timezone-aware v2 for GENUINELY NEW challenges
// only, and must PRESERVE any existing active challenge untouched. The DB layer is
// mocked so this runs without Mongo; the real date-key logic (tz resolution, civil
// -date validation, local-date default) runs unmocked so these are true integration
// checks of the activation contract.

const { auth, connectDB, findByIdAndUpdate, findOne, create } = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
  findByIdAndUpdate: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/User', () => ({ User: { findByIdAndUpdate } }))
vi.mock('@/models/Challenge', () => ({ Challenge: { findOne, create } }))

import { POST, onboard } from './route'

const USER_ID = '507f1f77bcf86cd799439011'

function req(body: unknown): import('next/server').NextRequest {
  return new Request('http://localhost/api/users/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

const goodBody = (over: Record<string, unknown> = {}) => ({
  age: 30,
  gender: 'female',
  heightCm: 170,
  weightKg: 65,
  goal: 'lose',
  focusArea: 'nutrition',
  startDate: '2026-07-23',
  totalDays: 75,
  ...over,
})

// A mongoose-like user doc: mutable timeZone + a save() spy, so we can assert both
// what the route persists and whether it wrote at all.
type MockUser = {
  _id: string
  username: string
  timeZone: string
  save: ReturnType<typeof vi.fn>
} & Record<string, unknown>

function makeUser(over: Partial<MockUser> = {}): MockUser {
  return {
    _id: USER_ID,
    username: 'qa',
    age: 30,
    gender: 'female',
    heightCm: 170,
    weightKg: 65,
    goal: 'lose',
    focusArea: 'nutrition',
    timeZone: DEFAULT_TIME_ZONE,
    save: vi.fn().mockResolvedValue(undefined),
    ...over,
  }
}

/** Make User.findByIdAndUpdate(...).catch(() => null) resolve to `user`. */
function userFound(user: MockUser) {
  findByIdAndUpdate.mockReturnValue({ catch: () => Promise.resolve(user) })
}

/** An existing active challenge doc (as returned by Challenge.findOne). */
function makeChallenge(over: Record<string, unknown> = {}) {
  return {
    _id: 'challenge-1',
    userId: USER_ID,
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    totalDays: 75,
    currentDay: 10,
    currentStreak: 9,
    longestStreak: 9,
    lastCompletedDate: '2026-06-09',
    timeZone: 'UTC',
    dateKeyVersion: 1,
    isActive: true,
    ...over,
  }
}

const fixedClock = (iso: string) => () => new Date(iso)

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  findByIdAndUpdate.mockReset()
  findOne.mockReset()
  create.mockReset()

  auth.mockResolvedValue({ user: { id: USER_ID } })
  userFound(makeUser())
  findOne.mockResolvedValue(null) // default: no active challenge → create path
  create.mockImplementation((doc: Record<string, unknown>) => Promise.resolve({ ...doc }))
})

// ── Challenge-length validation (preserved contract, now via Challenge.create) ──
describe('POST /api/users/onboarding — challenge length validation', () => {
  for (const len of [30, 40, 55, 75]) {
    it(`accepts the supported length ${len} and persists it`, async () => {
      const res = await POST(req(goodBody({ totalDays: len })))
      expect(res.status).toBe(200)
      expect(create.mock.calls[0][0].totalDays).toBe(len)
    })
  }

  it('accepts a numeric-string length and persists it as a number', async () => {
    const res = await POST(req(goodBody({ totalDays: '40' })))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].totalDays).toBe(40)
  })

  for (const bad of [50, 76, 29, 0, -75, 100, 365, 75.5]) {
    it(`rejects unsupported length ${bad} with 400 and writes no challenge`, async () => {
      const res = await POST(req(goodBody({ totalDays: bad })))
      expect(res.status).toBe(400)
      expect(create).not.toHaveBeenCalled()
    })
  }

  it('rejects a missing length instead of defaulting to 75', async () => {
    const body = goodBody()
    delete (body as Record<string, unknown>).totalDays
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a garbage length string with 400', async () => {
    const res = await POST(req(goodBody({ totalDays: 'seventy-five' })))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(req(goodBody()))
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('returns 404 when the session user no longer exists', async () => {
    findByIdAndUpdate.mockReturnValue({ catch: (cb: () => null) => Promise.resolve(cb()) })
    const res = await POST(req(goodBody()))
    expect(res.status).toBe(404)
    expect(create).not.toHaveBeenCalled()
  })
})

// ── v2 activation for genuinely new challenges ──
describe('new-challenge v2 activation', () => {
  it('new user + valid submitted tz → stores it on User + Challenge, dateKeyVersion 2', async () => {
    const user = makeUser({ timeZone: DEFAULT_TIME_ZONE })
    userFound(user)
    const res = await POST(req(goodBody({ timeZone: 'America/New_York' })))
    expect(res.status).toBe(200)
    const doc = create.mock.calls[0][0]
    expect(doc.dateKeyVersion).toBe(2)
    expect(doc.timeZone).toBe('America/New_York')
    expect(user.timeZone).toBe('America/New_York')
    expect(user.save).toHaveBeenCalledTimes(1)
  })

  it('new user + missing tz → DEFAULT_TIME_ZONE fallback, onboarding succeeds', async () => {
    const user = makeUser({ timeZone: DEFAULT_TIME_ZONE })
    userFound(user)
    const body = goodBody()
    delete (body as Record<string, unknown>).timeZone
    const res = await POST(req(body))
    expect(res.status).toBe(200)
    const doc = create.mock.calls[0][0]
    expect(doc.dateKeyVersion).toBe(2)
    expect(doc.timeZone).toBe(DEFAULT_TIME_ZONE)
    expect(user.timeZone).toBe(DEFAULT_TIME_ZONE)
  })

  it('new user + invalid tz → falls back safely, invalid value never persisted', async () => {
    const user = makeUser({ timeZone: DEFAULT_TIME_ZONE })
    userFound(user)
    const res = await POST(req(goodBody({ timeZone: 'Europe/Tbilisi' })))
    expect(res.status).toBe(200)
    const doc = create.mock.calls[0][0]
    expect(doc.timeZone).toBe(DEFAULT_TIME_ZONE)
    expect(doc.timeZone).not.toBe('Europe/Tbilisi')
    expect(user.timeZone).toBe(DEFAULT_TIME_ZONE)
  })

  it('existing user tz + missing submitted tz → snapshots the stored tz', async () => {
    const user = makeUser({ timeZone: 'Europe/London' })
    userFound(user)
    const body = goodBody()
    delete (body as Record<string, unknown>).timeZone
    const res = await POST(req(body))
    expect(res.status).toBe(200)
    const doc = create.mock.calls[0][0]
    expect(doc.timeZone).toBe('Europe/London')
    expect(doc.dateKeyVersion).toBe(2)
    expect(user.save).not.toHaveBeenCalled() // unchanged → no needless write
  })

  it('existing valid user tz + invalid submitted tz → stored tz not overwritten', async () => {
    const user = makeUser({ timeZone: 'America/New_York' })
    userFound(user)
    const res = await POST(req(goodBody({ timeZone: '+04:00' })))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].timeZone).toBe('America/New_York')
    expect(user.timeZone).toBe('America/New_York')
    expect(user.save).not.toHaveBeenCalled()
  })

  it('historical/inactive challenges exist but none active → creates a v2 challenge', async () => {
    // findOne({isActive:true}) returns null (inactive ones are not matched at all).
    findOne.mockResolvedValue(null)
    const res = await POST(req(goodBody({ timeZone: 'Asia/Tokyo' })))
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].dateKeyVersion).toBe(2)
  })

  for (const tz of ['UTC', 'Asia/Tbilisi', 'America/New_York', 'Europe/London']) {
    it(`accepts valid tz ${tz}`, async () => {
      userFound(makeUser({ timeZone: DEFAULT_TIME_ZONE }))
      const res = await POST(req(goodBody({ timeZone: tz })))
      expect(res.status).toBe(200)
      expect(create.mock.calls[0][0].timeZone).toBe(tz)
    })
  }

  for (const tz of ['Europe/Tbilisi', '+04:00', 'UTC+4', 'junk', '']) {
    it(`rejects invalid tz ${JSON.stringify(tz)} as a candidate (never persisted)`, async () => {
      userFound(makeUser({ timeZone: DEFAULT_TIME_ZONE }))
      const res = await POST(req(goodBody({ timeZone: tz })))
      expect(res.status).toBe(200) // onboarding still succeeds
      expect(create.mock.calls[0][0].timeZone).toBe(DEFAULT_TIME_ZONE)
    })
  }
})

// ── Existing active challenges are preserved, never migrated/overwritten ──
describe('existing active challenge preservation', () => {
  it('active v1 challenge + repeat onboarding → left untouched, no new challenge', async () => {
    const existing = makeChallenge({ dateKeyVersion: 1, timeZone: 'UTC' })
    findOne.mockResolvedValue(existing)
    const res = await POST(req(goodBody({ timeZone: 'America/New_York', totalDays: 40 })))
    expect(res.status).toBe(200)
    // No create, and the existing doc's identity fields are unchanged.
    expect(create).not.toHaveBeenCalled()
    expect(existing.dateKeyVersion).toBe(1)
    expect(existing.timeZone).toBe('UTC')
    expect(existing.startDate).toEqual(new Date('2026-06-01T00:00:00.000Z'))
    expect(existing.totalDays).toBe(75) // submitted 40 ignored — not overwritten
    expect(existing.currentStreak).toBe(9)
    // Response reflects the PRESERVED challenge, not the submitted values.
    const json = await res.json()
    expect(json.profile.totalDays).toBe(75)
    expect(json.profile.startDate).toBe('2026-06-01')
  })

  it('active v2 challenge + repeat onboarding with a different valid tz → snapshot unchanged', async () => {
    const existing = makeChallenge({ dateKeyVersion: 2, timeZone: 'Asia/Tbilisi' })
    findOne.mockResolvedValue(existing)
    const user = makeUser({ timeZone: 'Asia/Tbilisi' })
    userFound(user)
    const res = await POST(req(goodBody({ timeZone: 'America/New_York' })))
    expect(res.status).toBe(200)
    expect(create).not.toHaveBeenCalled()
    // Challenge snapshot + version untouched...
    expect(existing.timeZone).toBe('Asia/Tbilisi')
    expect(existing.dateKeyVersion).toBe(2)
    // ...but User.timeZone MAY update per policy.
    expect(user.timeZone).toBe('America/New_York')
    expect(user.save).toHaveBeenCalledTimes(1)
  })

  it('updating User.timeZone never mutates the existing challenge snapshot', async () => {
    const existing = makeChallenge({ dateKeyVersion: 1, timeZone: 'UTC' })
    findOne.mockResolvedValue(existing)
    const user = makeUser({ timeZone: 'UTC' })
    userFound(user)
    await POST(req(goodBody({ timeZone: 'Asia/Tokyo' })))
    expect(user.timeZone).toBe('Asia/Tokyo')
    expect(existing.timeZone).toBe('UTC')
    expect(existing.dateKeyVersion).toBe(1)
  })
})

// ── Concurrency / duplicate-key race ──
describe('concurrent onboarding race', () => {
  it('duplicate-key on create → preserves the winner, returns success, no overwrite', async () => {
    // First findOne (initial check) → null; create loses the race (11000);
    // second findOne (reload) → the winner's challenge.
    const winner = makeChallenge({ dateKeyVersion: 2, timeZone: 'Asia/Tbilisi' })
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner)
    const dupErr = new mongoose.mongo.MongoServerError({ message: 'E11000 duplicate key' })
    ;(dupErr as { code?: number }).code = 11000
    create.mockRejectedValueOnce(dupErr)

    const res = await POST(req(goodBody()))
    expect(res.status).toBe(200)
    const json = await res.json()
    // Winner preserved (its startDate), not the loser's attempt.
    expect(json.profile.startDate).toBe('2026-06-01')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('non-duplicate DB error on create is not swallowed', async () => {
    findOne.mockResolvedValue(null)
    create.mockRejectedValueOnce(new Error('unexpected'))
    await expect(POST(req(goodBody()))).rejects.toThrow('unexpected')
  })
})

// ── startDate validation + local-civil default ──
describe('startDate handling', () => {
  it('accepts a valid explicit startDate and preserves it', async () => {
    const res = await POST(req(goodBody({ startDate: '2026-07-23' })))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].startDate).toEqual(new Date('2026-07-23T00:00:00.000Z'))
  })

  for (const bad of ['2026-02-31', '2026-13-01', '2026-7-3', '07/23/2026', 'today', '2026-02-29']) {
    it(`rejects malformed/impossible startDate ${JSON.stringify(bad)} with 400`, async () => {
      const res = await POST(req(goodBody({ startDate: bad })))
      expect(res.status).toBe(400)
      expect(create).not.toHaveBeenCalled()
    })
  }

  it('missing startDate → defaults to the LOCAL civil date (differs from UTC at the boundary)', async () => {
    userFound(makeUser({ timeZone: DEFAULT_TIME_ZONE }))
    const body = goodBody({ timeZone: 'Asia/Tbilisi' })
    delete (body as Record<string, unknown>).startDate
    // 22:00Z == 02:00 local Jul 6 in Tbilisi. UTC would say Jul 5 (the bug).
    const res = await onboard(req(body), fixedClock('2026-07-05T22:00:00.000Z'))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].startDate).toEqual(new Date('2026-07-06T00:00:00.000Z'))
  })

  it('empty startDate string → treated as missing, uses the local-civil default', async () => {
    userFound(makeUser({ timeZone: DEFAULT_TIME_ZONE }))
    const res = await onboard(req(goodBody({ startDate: '', timeZone: 'UTC' })), fixedClock('2026-07-05T22:00:00.000Z'))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].startDate).toEqual(new Date('2026-07-05T00:00:00.000Z'))
  })

  it('stores civil date as UTC-midnight — no server-local off-by-one', async () => {
    const res = await POST(req(goodBody({ startDate: '2026-01-01' })))
    expect(res.status).toBe(200)
    const stored: Date = create.mock.calls[0][0].startDate
    expect(stored.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })
})

// ── API contract ──
describe('response contract', () => {
  it('preserves the profile response shape', async () => {
    const res = await POST(req(goodBody()))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Object.keys(json.profile).sort()).toEqual(
      ['age', 'focusArea', 'gender', 'goal', 'heightCm', 'id', 'startDate', 'totalDays', 'username', 'weightKg'].sort()
    )
    // No internal fields leak.
    expect(json.profile).not.toHaveProperty('timeZone')
    expect(json.profile).not.toHaveProperty('dateKeyVersion')
    expect(json.profile).not.toHaveProperty('_id')
  })
})
