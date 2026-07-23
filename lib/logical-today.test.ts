// Phase 2D-3 regression tests for the pure "logical today" decision that
// recomputeDailyLog now uses. Pure + deterministic (explicit instant, explicit
// stored timezones/version) — no DB, no machine-clock/timezone dependence.
import { describe, it, expect } from 'vitest'
import { logicalToday, DEFAULT_TIME_ZONE } from './date-key'

const at = (iso: string) => new Date(iso)
// 22:00Z == 02:00 next-day local in Tbilisi (UTC+4): the misfiled-window instant.
const LATE_NIGHT = at('2026-07-05T22:00:00.000Z')

describe('logicalToday — legacy version 1 (UTC-derived, behavior UNCHANGED)', () => {
  it('uses UTC even when timezones are stored (version 1 ignores them)', () => {
    expect(
      logicalToday({
        instant: LATE_NIGHT,
        challengeTimeZone: 'Asia/Tbilisi',
        userTimeZone: 'Asia/Tbilisi',
        dateKeyVersion: 1,
      })
    ).toBe('2026-07-05')
  })

  it('defaults to version 1 when dateKeyVersion is omitted', () => {
    expect(logicalToday({ instant: LATE_NIGHT })).toBe('2026-07-05')
  })

  it('is byte-for-byte the OLD toDateStr(new Date()) expression for any instant', () => {
    for (const iso of [
      '2026-03-09T04:30:00.000Z',
      '2026-12-31T23:59:59.999Z',
      '2026-01-01T00:00:00.000Z',
      '2024-02-29T12:00:00.000Z',
    ]) {
      const instant = at(iso)
      expect(logicalToday({ instant, dateKeyVersion: 1 })).toBe(instant.toISOString().split('T')[0])
    }
  })
})

describe('logicalToday — version 2 (timezone-aware)', () => {
  it('Asia/Tbilisi rolls at local midnight (04:00 UTC), not UTC midnight', () => {
    expect(logicalToday({ instant: LATE_NIGHT, challengeTimeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })).toBe('2026-07-06')
    expect(
      logicalToday({ instant: at('2026-07-05T19:59:59.999Z'), challengeTimeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })
    ).toBe('2026-07-05')
    expect(
      logicalToday({ instant: at('2026-07-05T20:00:00.000Z'), challengeTimeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })
    ).toBe('2026-07-06')
  })

  it('UTC challenge behaves as UTC', () => {
    expect(logicalToday({ instant: LATE_NIGHT, challengeTimeZone: 'UTC', dateKeyVersion: 2 })).toBe('2026-07-05')
  })

  it('America/New_York (DST-aware)', () => {
    expect(
      logicalToday({ instant: at('2026-07-15T03:59:59.999Z'), challengeTimeZone: 'America/New_York', dateKeyVersion: 2 })
    ).toBe('2026-07-14')
    expect(
      logicalToday({ instant: at('2026-07-15T04:00:00.000Z'), challengeTimeZone: 'America/New_York', dateKeyVersion: 2 })
    ).toBe('2026-07-15')
  })

  it('challenge timezone wins over user timezone', () => {
    expect(
      logicalToday({ instant: LATE_NIGHT, challengeTimeZone: 'UTC', userTimeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })
    ).toBe('2026-07-05')
  })

  it('falls back to user timezone when the challenge has none', () => {
    expect(logicalToday({ instant: LATE_NIGHT, userTimeZone: 'Asia/Tbilisi', dateKeyVersion: 2 })).toBe('2026-07-06')
  })

  it('falls back to DEFAULT_TIME_ZONE (Asia/Tbilisi) when nothing is stored', () => {
    expect(DEFAULT_TIME_ZONE).toBe('Asia/Tbilisi')
    expect(logicalToday({ instant: LATE_NIGHT, dateKeyVersion: 2 })).toBe('2026-07-06')
  })

  it('an invalid stored timezone is skipped safely (never throws)', () => {
    expect(
      logicalToday({ instant: LATE_NIGHT, challengeTimeZone: 'Europe/Tbilisi', userTimeZone: 'UTC', dateKeyVersion: 2 })
    ).toBe('2026-07-05')
  })
})
