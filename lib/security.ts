// Server-only security helpers. Pure and unit-testable — no network, no I/O.
//
// These centralize the secret-comparison and regex-escaping logic that was
// previously duplicated (or done unsafely) across route handlers.

import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison. Returns false on a length mismatch (the
 * length difference is not itself secret) so `timingSafeEqual` — which throws
 * on unequal-length buffers — is only ever called on equal-length inputs.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Verify an `Authorization: Bearer <token>` header against an expected secret.
 *
 * Denies the request when:
 *  - the expected secret is missing or empty (so an unset env var can NEVER be
 *    satisfied by a literal `Bearer undefined` header),
 *  - the header is missing,
 *  - the header is malformed (no `Bearer ` prefix, or an empty token),
 *  - the token does not match (compared in constant time).
 */
export function verifyBearerSecret(
  authHeader: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!expected) return false
  if (!authHeader) return false

  const prefix = 'Bearer '
  if (!authHeader.startsWith(prefix)) return false

  const token = authHeader.slice(prefix.length)
  if (!token) return false

  return constantTimeEqual(token, expected)
}

/** Escape a string so it matches literally inside a JS/MongoDB RegExp. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
