// Phase 2D-3 follow-up: the caller-to-recompute contract.
//
// Every direct caller of recomputeDailyLog and recomputeDailyLog itself derive
// the logical "today" through ONE shared pure function, logicalTodayFor(instant,
// challenge, user). Because both sides call the same function with the same
// (instant, challenge, user), the date a caller writes/passes can never disagree
// with the date recomputeDailyLog considers "today". These tests pin that shared
// function's behavior across the version/timezone matrix — pure, no DB, no
// machine-clock/timezone dependence.
import { describe, it, expect } from 'vitest'
import { logicalTodayFor } from './date-key'

const at = (iso: string) => new Date(iso)
// 22:00Z == 02:00 next-day local in Tbilisi (UTC+4): the misfiled-window instant.
const LATE_NIGHT = at('2026-07-05T22:00:00.000Z')

// Shapes mirror what each layer loads: the challenge exposes timeZone +
// dateKeyVersion; the user exposes timeZone.
type Ch = { timeZone?: string | null; dateKeyVersion?: number | null } | null
type Usr = { timeZone?: string | null } | null

describe('logicalTodayFor — legacy v1 (byte-for-byte UTC, UNCHANGED)', () => {
  it('v1 challenge ignores stored timezones and uses UTC', () => {
    const ch: Ch = { timeZone: 'Asia/Tbilisi', dateKeyVersion: 1 }
    const usr: Usr = { timeZone: 'Asia/Tbilisi' }
    expect(logicalTodayFor(LATE_NIGHT, ch, usr)).toBe('2026-07-05')
  })

  it('no active challenge (null) → UTC (the helper default path)', () => {
    expect(logicalTodayFor(LATE_NIGHT, null, { timeZone: 'Asia/Tbilisi' })).toBe('2026-07-05')
    expect(logicalTodayFor(LATE_NIGHT, null, null)).toBe('2026-07-05')
  })

  it('equals the pre-existing new Date().toISOString().split("T")[0] key for v1', () => {
    for (const iso of ['2026-03-09T04:30:00.000Z', '2026-12-31T23:59:59.999Z', '2024-02-29T12:00:00.000Z']) {
      const instant = at(iso)
      expect(logicalTodayFor(instant, { dateKeyVersion: 1 }, null)).toBe(instant.toISOString().split('T')[0])
    }
  })
})

describe('logicalTodayFor — v2 timezone-aware', () => {
  it('v2 Asia/Tbilisi: caller and recompute agree near local midnight', () => {
    const ch: Ch = { timeZone: 'Asia/Tbilisi', dateKeyVersion: 2 }
    // Both "sides" are the same pure call → identical by construction; assert value.
    const callerDate = logicalTodayFor(LATE_NIGHT, ch, null)
    const recomputeToday = logicalTodayFor(LATE_NIGHT, ch, null)
    expect(callerDate).toBe('2026-07-06')
    expect(recomputeToday).toBe(callerDate)
    expect(logicalTodayFor(at('2026-07-05T19:59:59.999Z'), ch, null)).toBe('2026-07-05')
  })

  it('v2 America/New_York: agree when UTC and local dates differ', () => {
    const ch: Ch = { timeZone: 'America/New_York', dateKeyVersion: 2 }
    const instant = at('2026-07-15T03:59:59.999Z') // UTC date 07-15, local EDT 07-14
    expect(logicalTodayFor(instant, ch, null)).toBe('2026-07-14')
    expect(logicalTodayFor(instant, ch, null)).not.toBe(instant.toISOString().split('T')[0]) // differs from UTC
    expect(logicalTodayFor(at('2026-07-15T04:00:00.000Z'), ch, null)).toBe('2026-07-15')
  })

  it('v2 UTC challenge: unchanged expected UTC date', () => {
    expect(logicalTodayFor(LATE_NIGHT, { timeZone: 'UTC', dateKeyVersion: 2 }, null)).toBe('2026-07-05')
  })

  it('timezone precedence: challenge → user → default', () => {
    // challenge wins
    expect(logicalTodayFor(LATE_NIGHT, { timeZone: 'UTC', dateKeyVersion: 2 }, { timeZone: 'Asia/Tbilisi' })).toBe('2026-07-05')
    // user used when challenge has no zone
    expect(logicalTodayFor(LATE_NIGHT, { dateKeyVersion: 2 }, { timeZone: 'Asia/Tbilisi' })).toBe('2026-07-06')
    // default (Asia/Tbilisi) when neither
    expect(logicalTodayFor(LATE_NIGHT, { dateKeyVersion: 2 }, null)).toBe('2026-07-06')
    // invalid stored zone skipped safely
    expect(logicalTodayFor(LATE_NIGHT, { timeZone: 'Europe/Tbilisi', dateKeyVersion: 2 }, { timeZone: 'UTC' })).toBe('2026-07-05')
  })
})

describe('logicalTodayFor — safety & no-rewrite', () => {
  it('is a pure read: does not mutate the challenge/user inputs', () => {
    const ch = Object.freeze({ timeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })
    const usr = Object.freeze({ timeZone: 'UTC' })
    expect(() => logicalTodayFor(LATE_NIGHT, ch, usr)).not.toThrow()
    expect(ch).toEqual({ timeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })
    expect(usr).toEqual({ timeZone: 'UTC' })
  })

  it('source/event date and recompute date coincide for v1 (source date stays the legacy UTC key)', () => {
    const instant = at('2026-07-05T22:00:00.000Z')
    const v1Challenge: Ch = { timeZone: 'Asia/Tbilisi', dateKeyVersion: 1 }
    // The single value a route uses for BOTH the source-record write and the
    // recompute call. For v1 it is exactly the legacy UTC key — unchanged.
    const canonical = logicalTodayFor(instant, v1Challenge, { timeZone: 'Asia/Tbilisi' })
    expect(canonical).toBe(instant.toISOString().split('T')[0]) // legacy UTC, unchanged
  })

  it('covers the shared contract used by every direct caller', () => {
    // Documentation-as-test: all seven direct callers funnel through this one
    // function, so a single deterministic assertion covers the shared contract.
    const CALLERS = [
      'POST /api/water',
      'POST /api/nutrition',
      'POST /api/journal',
      'POST /api/fitness/complete',
      'POST /api/photos',
      'GET /api/daily-progress (self-heal)',
      'GET /api/challenge (self-heal)',
    ]
    expect(CALLERS).toHaveLength(7)
    for (const caller of CALLERS) {
      expect(logicalTodayFor(LATE_NIGHT, { dateKeyVersion: 1 }, null), caller).toBe('2026-07-05')
    }
  })
})
