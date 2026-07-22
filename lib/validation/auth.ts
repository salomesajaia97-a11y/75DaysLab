// Server-side registration validation. Pure, dependency-free, and unit-tested
// (lib/validation/auth.test.ts) so it can be trusted as the single source of
// truth for both the register API route and any future auth surface. Never rely
// on HTML/client validation alone — this runs before any DB lookup.

export interface RegisterFields {
  username: string
  email: string
  password: string
}

export type RegisterInput = {
  username?: unknown
  email?: unknown
  password?: unknown
}

export type ValidationResult =
  | { ok: true; value: RegisterFields }
  | { ok: false; field: 'username' | 'email' | 'password'; error: string }

export const MAX_EMAIL_LENGTH = 254 // RFC 5321 upper bound
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 200
export const MIN_USERNAME_LENGTH = 2
export const MAX_USERNAME_LENGTH = 30

// Pragmatic address shape: non-empty local part, a domain, and a dotted TLD,
// with no whitespace anywhere. Deliberately stricter than "has an @" so bare
// tokens like "not-an-email" and "user@localhost" are rejected.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim + lowercase — the canonical stored form. Uniqueness must use this. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** True when `email` is a well-formed, reasonably-sized address. */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  if (normalized.length === 0 || normalized.length > MAX_EMAIL_LENGTH) return false
  return EMAIL_RE.test(normalized)
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/**
 * Validate + normalize a registration payload. Returns normalized values on
 * success, or the first offending field with a safe, user-facing message.
 * Error messages never echo the submitted password.
 */
export function validateRegister(input: RegisterInput): ValidationResult {
  const username = asString(input.username).trim()
  const email = normalizeEmail(asString(input.email))
  const password = asString(input.password)

  if (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH) {
    return {
      ok: false,
      field: 'username',
      error: `Username must be ${MIN_USERNAME_LENGTH}–${MAX_USERNAME_LENGTH} characters`,
    }
  }

  if (!isValidEmail(email)) {
    return { ok: false, field: 'email', error: 'Please enter a valid email address' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      field: 'password',
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    }
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      field: 'password',
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    }
  }

  return { ok: true, value: { username, email, password } }
}
