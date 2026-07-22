import { describe, it, expect } from 'vitest'
import {
  ALLOWED_CHALLENGE_LENGTHS,
  isAllowedChallengeLength,
  validateChallengeLength,
} from './challenge'

describe('ALLOWED_CHALLENGE_LENGTHS', () => {
  it('is exactly the four supported lengths', () => {
    expect([...ALLOWED_CHALLENGE_LENGTHS]).toEqual([30, 40, 55, 75])
  })
})

describe('isAllowedChallengeLength', () => {
  it('accepts each supported length', () => {
    for (const n of [30, 40, 55, 75]) expect(isAllowedChallengeLength(n)).toBe(true)
  })
  it('rejects unsupported numbers', () => {
    for (const n of [0, 1, 29, 31, 50, 75.5, 76, 100, 365, -75]) {
      expect(isAllowedChallengeLength(n)).toBe(false)
    }
  })
  it('rejects NaN / Infinity', () => {
    expect(isAllowedChallengeLength(NaN)).toBe(false)
    expect(isAllowedChallengeLength(Infinity)).toBe(false)
  })
})

describe('validateChallengeLength', () => {
  it('accepts each supported length as a number', () => {
    for (const n of [30, 40, 55, 75]) {
      const r = validateChallengeLength(n)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBe(n)
    }
  })

  it('accepts a numeric string that equals a supported length', () => {
    const r = validateChallengeLength('55')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(55)
  })

  it('trims a numeric string before checking', () => {
    const r = validateChallengeLength('  75  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(75)
  })

  it('rejects an unsupported number without coercing', () => {
    const r = validateChallengeLength(50)
    expect(r.ok).toBe(false)
  })

  it('rejects an unsupported number near a valid one', () => {
    expect(validateChallengeLength(76).ok).toBe(false)
    expect(validateChallengeLength(29).ok).toBe(false)
  })

  it('rejects a fractional value', () => {
    expect(validateChallengeLength(75.5).ok).toBe(false)
  })

  it('rejects a non-integer numeric string', () => {
    expect(validateChallengeLength('75.0').ok).toBe(false)
    expect(validateChallengeLength('7 5').ok).toBe(false)
  })

  it('rejects null / undefined / boolean / object', () => {
    expect(validateChallengeLength(null).ok).toBe(false)
    expect(validateChallengeLength(undefined).ok).toBe(false)
    expect(validateChallengeLength(true).ok).toBe(false)
    expect(validateChallengeLength({}).ok).toBe(false)
    expect(validateChallengeLength([75]).ok).toBe(false)
  })

  it('rejects an empty / garbage string', () => {
    expect(validateChallengeLength('').ok).toBe(false)
    expect(validateChallengeLength('   ').ok).toBe(false)
    expect(validateChallengeLength('seventy-five').ok).toBe(false)
  })

  it('does NOT silently default an invalid value to 75', () => {
    const r = validateChallengeLength('999')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeTypeOf('string')
  })
})
