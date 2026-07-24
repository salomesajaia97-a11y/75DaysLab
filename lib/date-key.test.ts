import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TIME_ZONE,
  systemClock,
  currentInstant,
  isValidTimeZone,
  resolveTimeZone,
  dayKey,
  currentDayKey,
  isValidCivilDate,
  resolveOnboardingTimeZone,
  type Clock,
} from './date-key'

// All tests below feed EXPLICIT UTC instants and EXPLICIT IANA time zones, so
// results never depend on the machine's local timezone. A fixed-instant clock is
// injected wherever "now" is involved. Nothing here reads the ambient clock/tz.

// A clock frozen at a chosen instant (for injection into currentInstant/currentDayKey).
const fixedClock = (iso: string): Clock => () => new Date(iso)

describe('DEFAULT_TIME_ZONE', () => {
  it('is Asia/Tbilisi (the valid IANA id for Georgia)', () => {
    expect(DEFAULT_TIME_ZONE).toBe('Asia/Tbilisi')
  })
  it('is itself a valid IANA zone', () => {
    expect(isValidTimeZone(DEFAULT_TIME_ZONE)).toBe(true)
  })
})

describe('isValidTimeZone', () => {
  it('accepts valid IANA identifiers', () => {
    for (const tz of ['UTC', 'Asia/Tbilisi', 'America/New_York', 'Asia/Tokyo', 'Europe/London']) {
      expect(isValidTimeZone(tz)).toBe(true)
    }
  })

  it('rejects Europe/Tbilisi — NOT a real IANA zone (the correct id is Asia/Tbilisi)', () => {
    expect(isValidTimeZone('Europe/Tbilisi')).toBe(false)
  })

  it('rejects junk, empty, and non-string inputs', () => {
    for (const bad of ['Not/AZone', 'foo', '', 'utc/utc', '+04:00', ' Asia/Tbilisi']) {
      expect(isValidTimeZone(bad)).toBe(false)
    }
    for (const bad of [null, undefined, 42, {}, [], NaN]) {
      expect(isValidTimeZone(bad)).toBe(false)
    }
  })
})

describe('dayKey — timezone-aware civil date', () => {
  it('UTC returns the UTC calendar date', () => {
    expect(dayKey(new Date('2026-07-05T20:30:00.000Z'), 'UTC')).toBe('2026-07-05')
    expect(dayKey(new Date('2026-07-05T00:00:00.000Z'), 'UTC')).toBe('2026-07-05')
    expect(dayKey(new Date('2026-07-05T23:59:59.999Z'), 'UTC')).toBe('2026-07-05')
  })

  describe('Asia/Tbilisi (UTC+4, no DST) — the 04:00-local rollover bug', () => {
    it('before local midnight → same day', () => {
      // 19:59:59Z == 23:59:59 local → still 2026-07-05
      expect(dayKey(new Date('2026-07-05T19:59:59.999Z'), 'Asia/Tbilisi')).toBe('2026-07-05')
    })
    it('exactly local midnight → next day', () => {
      // 20:00:00Z == 00:00:00 local Jul 6
      expect(dayKey(new Date('2026-07-05T20:00:00.000Z'), 'Asia/Tbilisi')).toBe('2026-07-06')
    })
    it('just after local midnight → next day', () => {
      expect(dayKey(new Date('2026-07-05T20:00:00.001Z'), 'Asia/Tbilisi')).toBe('2026-07-06')
    })
    it('02:00 local (the misfiled window) → local day, NOT the UTC day', () => {
      // 22:00Z == 02:00 local Jul 6. UTC would say 2026-07-05 (the bug); local is Jul 6.
      const instant = new Date('2026-07-05T22:00:00.000Z')
      expect(dayKey(instant, 'Asia/Tbilisi')).toBe('2026-07-06')
      expect(dayKey(instant, 'UTC')).toBe('2026-07-05')
    })
  })

  describe('America/New_York (DST-observing)', () => {
    it('winter EST (UTC-5)', () => {
      expect(dayKey(new Date('2026-01-15T04:59:59.999Z'), 'America/New_York')).toBe('2026-01-14')
      expect(dayKey(new Date('2026-01-15T05:00:00.000Z'), 'America/New_York')).toBe('2026-01-15')
    })
    it('summer EDT (UTC-4)', () => {
      expect(dayKey(new Date('2026-07-15T03:59:59.999Z'), 'America/New_York')).toBe('2026-07-14')
      expect(dayKey(new Date('2026-07-15T04:00:00.000Z'), 'America/New_York')).toBe('2026-07-15')
    })
  })

  describe('Asia/Tokyo (UTC+9)', () => {
    it('rolls the day 9h ahead of UTC', () => {
      expect(dayKey(new Date('2026-12-31T14:59:59.999Z'), 'Asia/Tokyo')).toBe('2026-12-31')
      expect(dayKey(new Date('2026-12-31T15:00:00.000Z'), 'Asia/Tokyo')).toBe('2027-01-01')
    })
  })

  describe('Europe/London (DST timezone: GMT/BST)', () => {
    it('winter GMT (UTC+0)', () => {
      expect(dayKey(new Date('2026-01-15T23:30:00.000Z'), 'Europe/London')).toBe('2026-01-15')
    })
    it('summer BST (UTC+1) crosses midnight before UTC does', () => {
      // 23:30Z == 00:30 BST next day
      expect(dayKey(new Date('2026-07-15T23:30:00.000Z'), 'Europe/London')).toBe('2026-07-16')
    })
  })

  describe('calendar edges', () => {
    it('leap day — real Feb 29 in a leap year (local)', () => {
      // 2024-02-28T20:00Z == 00:00 local Feb 29 in Tbilisi
      expect(dayKey(new Date('2024-02-28T20:00:00.000Z'), 'Asia/Tbilisi')).toBe('2024-02-29')
      expect(dayKey(new Date('2024-02-29T12:00:00.000Z'), 'UTC')).toBe('2024-02-29')
    })
    it('non-leap year has no Feb 29 — rolls to Mar 1', () => {
      // 2026-02-28T20:00Z == 00:00 local Mar 1 in Tbilisi (2026 not a leap year)
      expect(dayKey(new Date('2026-02-28T20:00:00.000Z'), 'Asia/Tbilisi')).toBe('2026-03-01')
    })
    it('month boundary', () => {
      expect(dayKey(new Date('2026-07-31T20:00:00.000Z'), 'Asia/Tbilisi')).toBe('2026-08-01')
    })
    it('year boundary', () => {
      expect(dayKey(new Date('2026-12-31T20:00:00.000Z'), 'Asia/Tbilisi')).toBe('2027-01-01')
    })
  })

  describe('validation', () => {
    it('throws on an invalid timezone', () => {
      expect(() => dayKey(new Date('2026-07-05T00:00:00.000Z'), 'Europe/Tbilisi')).toThrow()
      expect(() => dayKey(new Date('2026-07-05T00:00:00.000Z'), 'Not/AZone')).toThrow()
    })
    it('throws on an invalid instant', () => {
      expect(() => dayKey(new Date('nonsense'), 'UTC')).toThrow()
    })
    it('always returns strict YYYY-MM-DD', () => {
      expect(dayKey(new Date('2026-01-02T00:00:00.000Z'), 'UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // zero-padded single-digit month/day
      expect(dayKey(new Date('2026-01-02T12:00:00.000Z'), 'UTC')).toBe('2026-01-02')
    })
  })
})

describe('clock abstraction', () => {
  it('systemClock returns a Date', () => {
    expect(systemClock()).toBeInstanceOf(Date)
  })
  it('currentInstant defaults to the system clock (a Date)', () => {
    expect(currentInstant()).toBeInstanceOf(Date)
  })
  it('currentInstant returns the injected clock’s instant exactly', () => {
    const instant = currentInstant(fixedClock('2026-07-05T22:00:00.000Z'))
    expect(instant.toISOString()).toBe('2026-07-05T22:00:00.000Z')
  })
})

describe('currentDayKey — logical "today" for a zone', () => {
  it('uses the injected clock + zone', () => {
    const clock = fixedClock('2026-07-05T22:00:00.000Z') // 02:00 local Jul 6 in Tbilisi
    expect(currentDayKey('Asia/Tbilisi', clock)).toBe('2026-07-06')
    expect(currentDayKey('UTC', clock)).toBe('2026-07-05')
  })
  it('throws on an invalid zone', () => {
    expect(() => currentDayKey('Europe/Tbilisi', fixedClock('2026-07-05T22:00:00.000Z'))).toThrow()
  })
})

describe('resolveTimeZone — precedence challenge → user → default', () => {
  it('returns the default when nothing is provided', () => {
    expect(resolveTimeZone()).toBe(DEFAULT_TIME_ZONE)
    expect(resolveTimeZone({})).toBe(DEFAULT_TIME_ZONE)
  })
  it('uses userTimeZone when no challenge zone', () => {
    expect(resolveTimeZone({ userTimeZone: 'America/New_York' })).toBe('America/New_York')
  })
  it('challenge zone wins over user zone', () => {
    expect(
      resolveTimeZone({ challengeTimeZone: 'Asia/Tokyo', userTimeZone: 'America/New_York' })
    ).toBe('Asia/Tokyo')
  })
  it('skips null/undefined and falls through', () => {
    expect(resolveTimeZone({ challengeTimeZone: null, userTimeZone: undefined })).toBe(DEFAULT_TIME_ZONE)
    expect(resolveTimeZone({ challengeTimeZone: null, userTimeZone: 'UTC' })).toBe('UTC')
  })
  it('skips an INVALID zone and falls to the next valid source', () => {
    expect(resolveTimeZone({ challengeTimeZone: 'Europe/Tbilisi', userTimeZone: 'UTC' })).toBe('UTC')
    expect(resolveTimeZone({ challengeTimeZone: 'junk', userTimeZone: 'junk2' })).toBe(DEFAULT_TIME_ZONE)
  })
  it('honors an explicit valid defaultTimeZone', () => {
    expect(resolveTimeZone({ defaultTimeZone: 'UTC' })).toBe('UTC')
  })
  it('falls back to DEFAULT_TIME_ZONE if the provided default is invalid', () => {
    expect(resolveTimeZone({ defaultTimeZone: 'Europe/Tbilisi' })).toBe(DEFAULT_TIME_ZONE)
  })
  it('always returns a valid zone', () => {
    expect(isValidTimeZone(resolveTimeZone({ challengeTimeZone: 'bad', userTimeZone: 'worse' }))).toBe(true)
  })
})

describe('isValidCivilDate — exact YYYY-MM-DD naming a real calendar day', () => {
  it('accepts well-formed real dates', () => {
    for (const s of ['2026-07-25', '2000-01-01', '2024-02-29', '2026-12-31', '1999-11-30']) {
      expect(isValidCivilDate(s)).toBe(true)
    }
  })
  it('rejects impossible dates JS would silently normalize', () => {
    // '2026-02-31' → Date.UTC rolls to Mar 3; must be rejected, not accepted.
    for (const s of ['2026-02-31', '2026-02-30', '2026-04-31', '2026-06-31', '2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32']) {
      expect(isValidCivilDate(s)).toBe(false)
    }
  })
  it('rejects Feb 29 in a non-leap year', () => {
    expect(isValidCivilDate('2026-02-29')).toBe(false)
    expect(isValidCivilDate('2100-02-29')).toBe(false) // century non-leap
  })
  it('rejects wrong shapes, offsets, and non-strings', () => {
    for (const s of ['2026-7-25', '26-07-25', '2026/07/25', '2026-07-25T00:00:00Z', '2026-07-25 ', ' 2026-07-25', '', 'today', '2026-07-2a']) {
      expect(isValidCivilDate(s)).toBe(false)
    }
    for (const s of [null, undefined, 20260725, {}, [], NaN]) {
      expect(isValidCivilDate(s)).toBe(false)
    }
  })
})

describe('resolveOnboardingTimeZone — submitted → stored user → default', () => {
  it('uses a valid submitted tz over the stored user tz', () => {
    expect(resolveOnboardingTimeZone('America/New_York', 'Asia/Tbilisi')).toBe('America/New_York')
  })
  it('falls back to the stored user tz when submitted is missing', () => {
    expect(resolveOnboardingTimeZone(undefined, 'Europe/London')).toBe('Europe/London')
    expect(resolveOnboardingTimeZone(null, 'Europe/London')).toBe('Europe/London')
  })
  it('falls back to the stored user tz when submitted is invalid (never overwrites a valid stored tz)', () => {
    for (const bad of ['Europe/Tbilisi', '+04:00', 'UTC+4', 'GMT-5', 'junk', '']) {
      expect(resolveOnboardingTimeZone(bad, 'America/New_York')).toBe('America/New_York')
    }
  })
  it('falls back to DEFAULT_TIME_ZONE when both are absent/invalid', () => {
    expect(resolveOnboardingTimeZone(undefined, undefined)).toBe(DEFAULT_TIME_ZONE)
    expect(resolveOnboardingTimeZone('+04:00', 'Europe/Tbilisi')).toBe(DEFAULT_TIME_ZONE)
  })
  it('accepts UTC as a valid submitted zone', () => {
    expect(resolveOnboardingTimeZone('UTC', 'Asia/Tbilisi')).toBe('UTC')
  })
  it('always returns a valid IANA zone', () => {
    expect(isValidTimeZone(resolveOnboardingTimeZone('bad', 'worse'))).toBe(true)
  })
})
