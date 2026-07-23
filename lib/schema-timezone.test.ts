// Phase 2D-2 schema-preparation tests. These assert the NEW timezone/versioning
// FIELDS and the unique-active-challenge INDEX DECLARATION only. They use
// mongoose validateSync() and schema introspection — NO database connection, no
// data, no route wiring. They do not exercise any runtime behavior change.

import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'

/** A single [fields, options] entry as returned by Schema.indexes(). */
type IndexEntry = [Record<string, unknown>, Record<string, unknown> | undefined]
import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'
import { resolveTimeZone, DEFAULT_TIME_ZONE } from '@/lib/date-key'

const newUser = (over: Record<string, unknown> = {}) =>
  new User({ username: 'tzuser', email: 'tz@example.com', ...over })

const newChallenge = (over: Record<string, unknown> = {}) =>
  new Challenge({ userId: new mongoose.Types.ObjectId(), startDate: new Date('2026-07-01T00:00:00Z'), ...over })

describe('User.timeZone', () => {
  it('defaults to Asia/Tbilisi', () => {
    expect(newUser().timeZone).toBe('Asia/Tbilisi')
  })

  it('accepts a valid IANA timezone', () => {
    const u = newUser({ timeZone: 'America/New_York' })
    expect(u.validateSync()?.errors.timeZone).toBeUndefined()
    expect(u.timeZone).toBe('America/New_York')
  })

  it('rejects an invalid timezone (non-IANA, junk, or offset)', () => {
    for (const bad of ['Europe/Tbilisi', 'junk', '+04:00']) {
      const u = newUser({ timeZone: bad })
      expect(u.validateSync()?.errors.timeZone, `should reject '${bad}'`).toBeDefined()
    }
  })
})

describe('Challenge.timeZone', () => {
  it('defaults to UTC (legacy compatibility — existing challenges behave as before)', () => {
    expect(newChallenge().timeZone).toBe('UTC')
  })

  it('accepts a valid IANA timezone', () => {
    const c = newChallenge({ timeZone: 'Asia/Tokyo' })
    expect(c.validateSync()?.errors.timeZone).toBeUndefined()
    expect(c.timeZone).toBe('Asia/Tokyo')
  })

  it('rejects an invalid timezone', () => {
    for (const bad of ['Europe/Tbilisi', 'not-a-zone', '-0800']) {
      const c = newChallenge({ timeZone: bad })
      expect(c.validateSync()?.errors.timeZone, `should reject '${bad}'`).toBeDefined()
    }
  })
})

describe('Challenge.dateKeyVersion', () => {
  it('defaults to 1', () => {
    expect(newChallenge().dateKeyVersion).toBe(1)
  })

  it('accepts an explicit version number', () => {
    const c = newChallenge({ dateKeyVersion: 2 })
    expect(c.validateSync()?.errors.dateKeyVersion).toBeUndefined()
    expect(c.dateKeyVersion).toBe(2)
  })
})

describe('Challenge unique-active index (declaration only)', () => {
  it('declares a UNIQUE PARTIAL index on userId limited to isActive:true', () => {
    const indexes = Challenge.schema.indexes() as IndexEntry[]
    const match = indexes.find(
      ([fields, options]) =>
        fields.userId === 1 &&
        options?.unique === true &&
        (options?.partialFilterExpression as Record<string, unknown> | undefined)?.isActive === true
    )
    expect(match, 'expected a unique partial index {userId:1} where isActive:true').toBeDefined()
  })

  it('does NOT constrain inactive/historical challenges (partial filter is isActive:true only)', () => {
    const indexes = Challenge.schema.indexes() as IndexEntry[]
    const uniqueUserIndexes = indexes.filter(
      ([fields, options]) => fields.userId === 1 && options?.unique === true
    )
    // Every unique userId index must be partial-filtered to active challenges,
    // so multiple isActive:false (completed/historical) challenges stay allowed.
    for (const [, options] of uniqueUserIndexes) {
      expect((options?.partialFilterExpression as Record<string, unknown>)?.isActive).toBe(true)
    }
  })
})

describe('compatibility: resolveTimeZone over model-shaped inputs (service NOT wired into routes)', () => {
  it('legacy active challenge (timeZone=UTC) resolves to UTC even if the user has a real zone', () => {
    const user = newUser({ timeZone: 'Asia/Tbilisi' })
    const challenge = newChallenge() // legacy default → 'UTC'
    expect(resolveTimeZone({ challengeTimeZone: challenge.timeZone, userTimeZone: user.timeZone })).toBe('UTC')
  })

  it('a new challenge with a real zone wins over the user zone', () => {
    const user = newUser({ timeZone: 'Asia/Tbilisi' })
    const challenge = newChallenge({ timeZone: 'America/New_York' })
    expect(resolveTimeZone({ challengeTimeZone: challenge.timeZone, userTimeZone: user.timeZone })).toBe(
      'America/New_York'
    )
  })

  it('with no challenge zone at all, falls back to the user zone', () => {
    const user = newUser({ timeZone: 'Asia/Tokyo' })
    expect(resolveTimeZone({ challengeTimeZone: undefined, userTimeZone: user.timeZone })).toBe('Asia/Tokyo')
  })

  it('with neither, falls back to the default zone', () => {
    expect(resolveTimeZone({})).toBe(DEFAULT_TIME_ZONE)
  })
})
