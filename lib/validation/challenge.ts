// Server-side challenge-length validation. Pure, dependency-free, and
// unit-tested (lib/validation/challenge.test.ts) so it is the single source of
// truth for the supported challenge durations. The onboarding write path must
// use this — never coerce an unknown length to a default, which would silently
// enrol a user in a challenge they did not choose.

/** The only challenge lengths the product supports, in days. */
export const ALLOWED_CHALLENGE_LENGTHS = [30, 40, 55, 75] as const

export type ChallengeLength = (typeof ALLOWED_CHALLENGE_LENGTHS)[number]

export type ChallengeLengthResult =
  | { ok: true; value: ChallengeLength }
  | { ok: false; error: string }

/** True only for one of the supported lengths (integer, exact match). */
export function isAllowedChallengeLength(n: unknown): n is ChallengeLength {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    (ALLOWED_CHALLENGE_LENGTHS as readonly number[]).includes(n)
  )
}

/**
 * Validate an incoming challenge length. Accepts a number or a whole-number
 * string (e.g. "75"), normalizes it to a number, and requires it to be one of
 * the supported lengths. Any other value is REJECTED — never coerced to a
 * default.
 */
export function validateChallengeLength(input: unknown): ChallengeLengthResult {
  let n: number

  if (typeof input === 'number') {
    n = input
  } else if (typeof input === 'string' && /^\d+$/.test(input.trim())) {
    n = Number(input.trim())
  } else {
    return {
      ok: false,
      error: `Challenge length must be one of ${ALLOWED_CHALLENGE_LENGTHS.join(', ')} days`,
    }
  }

  if (!isAllowedChallengeLength(n)) {
    return {
      ok: false,
      error: `Challenge length must be one of ${ALLOWED_CHALLENGE_LENGTHS.join(', ')} days`,
    }
  }

  return { ok: true, value: n }
}
