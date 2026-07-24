import { describe, it, expect, vi, beforeEach } from 'vitest'

// resolveLogicalToday is THE read-side "today" source: every migrated GET
// endpoint (water/journal/nutrition/week) and the write paths derive their
// logical day through it. It loads the active challenge + user, then applies the
// canonical version-gated contract (logicalTodayFor):
//   - dateKeyVersion 1 (legacy): UTC — byte-for-byte the historical key.
//   - dateKeyVersion >= 2: civil date in challenge.timeZone -> user.timeZone ->
//     DEFAULT_TIME_ZONE (Asia/Tbilisi).
// The real contract (lib/date-key) is intentionally NOT mocked here — only the
// DB access is — so these assertions exercise the true version/timezone logic.

const { connectDB, challengeFindOne, userFindById } = vi.hoisted(() => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  challengeFindOne: vi.fn(),
  userFindById: vi.fn(),
}))

vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Challenge', () => ({ Challenge: { findOne: challengeFindOne } }))
vi.mock('@/models/User', () => ({ User: { findById: userFindById } }))

import { resolveLogicalToday } from './logical-day-context'

const USER_ID = '507f1f77bcf86cd799439011'

/** Stub a Mongoose `.select().lean()` chain resolving to `doc`. */
function leanChain(doc: unknown) {
  return { select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(doc) }
}

/** Load the active challenge + user for the next resolveLogicalToday call. */
function stubContext(challenge: unknown, user: unknown) {
  challengeFindOne.mockReturnValue(leanChain(challenge))
  userFindById.mockReturnValue(leanChain(user))
}

// An instant where the UTC civil date and the Asia/Tbilisi (UTC+4) civil date
// DISAGREE: 22:00Z on the 14th is 02:00 on the 15th in Tbilisi.
const INSTANT = new Date('2026-07-14T22:00:00.000Z')
const fixedClock = () => INSTANT
const UTC_DAY = '2026-07-14'
const TBILISI_DAY = '2026-07-15'

beforeEach(() => {
  connectDB.mockClear().mockResolvedValue(undefined)
  challengeFindOne.mockReset()
  userFindById.mockReset()
})

describe('resolveLogicalToday — default current day', () => {
  it('returns the UTC key when no challenge and no user exist (v1 default)', async () => {
    stubContext(null, null)
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(UTC_DAY)
  })

  it('connects to the DB before reading context', async () => {
    stubContext(null, null)
    await resolveLogicalToday(USER_ID, fixedClock)
    expect(connectDB).toHaveBeenCalledTimes(1)
    expect(challengeFindOne).toHaveBeenCalledWith({ userId: USER_ID, isActive: true })
  })
})

describe('resolveLogicalToday — legacy v1 compatibility', () => {
  it('ignores a stored timezone for a dateKeyVersion 1 challenge (UTC, unchanged)', async () => {
    stubContext({ timeZone: 'Asia/Tbilisi', dateKeyVersion: 1 }, { timeZone: 'Asia/Tbilisi' })
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(UTC_DAY)
  })

  it('treats a missing dateKeyVersion as v1 (UTC)', async () => {
    stubContext({ timeZone: 'Asia/Tbilisi' }, null)
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(UTC_DAY)
  })
})

describe('resolveLogicalToday — timezone-aware v2 behavior', () => {
  it('uses the challenge timezone for a dateKeyVersion 2 challenge', async () => {
    stubContext({ timeZone: 'Asia/Tbilisi', dateKeyVersion: 2 }, null)
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(TBILISI_DAY)
  })

  it('falls back to the user timezone when the v2 challenge has none', async () => {
    stubContext({ dateKeyVersion: 2 }, { timeZone: 'Asia/Tbilisi' })
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(TBILISI_DAY)
  })

  it('prefers the challenge timezone over the user timezone (precedence)', async () => {
    stubContext({ timeZone: 'UTC', dateKeyVersion: 2 }, { timeZone: 'Asia/Tbilisi' })
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(UTC_DAY)
  })

  it('falls back to DEFAULT_TIME_ZONE (Asia/Tbilisi) when v2 has no tz anywhere', async () => {
    stubContext({ dateKeyVersion: 2 }, null)
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(TBILISI_DAY)
  })
})

describe('resolveLogicalToday — resilience', () => {
  it('falls back to the legacy UTC key when the context load fails', async () => {
    connectDB.mockRejectedValueOnce(new Error('db down'))
    expect(await resolveLogicalToday(USER_ID, fixedClock)).toBe(UTC_DAY)
  })
})
