// Caller-side entry to the shared day-key contract (Phase 2D-3 follow-up).
//
// A direct caller of recomputeDailyLog needs the canonical logical "today"
// BEFORE it writes its source/event record (so the record is bucketed under the
// same day recomputeDailyLog will treat as today). This helper loads the same
// context recomputeDailyLog uses and applies the SAME pure contract
// (logicalTodayFor), so caller and recompute never disagree.
//
// Resilient by design: on any context-load failure it falls back to the legacy
// UTC key, so a write path never breaks on this lookup. Because every active
// challenge is currently dateKeyVersion 1, the result is UTC for all users today
// — byte-for-byte the previous behavior.

import { Challenge } from '@/models/Challenge'
import { User } from '@/models/User'
import { connectDB } from './mongoose'
import { logicalTodayFor, currentInstant, systemClock, type Clock } from './date-key'

/**
 * The user's canonical logical day key ('YYYY-MM-DD') for the given instant.
 * Precedence: challenge.timeZone → user.timeZone → DEFAULT_TIME_ZONE, gated by
 * challenge.dateKeyVersion (v1 = UTC legacy). Pass the SAME clock to
 * recomputeDailyLog so both layers evaluate a single shared instant.
 */
export async function resolveLogicalToday(userId: string, clock: Clock = systemClock): Promise<string> {
  const instant = currentInstant(clock)
  try {
    await connectDB()
    const [challenge, user] = await Promise.all([
      Challenge.findOne({ userId, isActive: true })
        .select('timeZone dateKeyVersion')
        .lean<{ timeZone?: string; dateKeyVersion?: number } | null>(),
      User.findById(userId).select('timeZone').lean<{ timeZone?: string } | null>(),
    ])
    return logicalTodayFor(instant, challenge, user)
  } catch {
    // Never break the write path on a context lookup — fall back to the legacy
    // UTC key (identical to v1 behavior, which is what all users have today).
    return logicalTodayFor(instant, null, null)
  }
}
