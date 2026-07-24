import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'
import { validateChallengeLength } from '@/lib/validation/challenge'
import {
  isValidCivilDate,
  resolveOnboardingTimeZone,
  currentDayKey,
  systemClock,
  type Clock,
} from '@/lib/date-key'

/**
 * Onboarding submit. Persists the user's profile and ensures an active challenge
 * exists — activating the timezone-aware v2 day-key convention for GENUINELY NEW
 * challenges only (Phase 2D-5).
 *
 * Create-or-PRESERVE, never overwrite: an existing active challenge (v1 or v2) is
 * left byte-for-byte untouched — its dateKeyVersion, timeZone snapshot, startDate,
 * and streak state are never rewritten, so repeat/duplicate onboarding can never
 * convert or reset a live attempt. A brand-new active challenge is created as v2
 * with a resolved IANA timezone snapshot.
 *
 * `clock` is injectable purely for deterministic tests of the start-date default;
 * production uses the system clock (see the POST wrapper below).
 */
export async function onboard(req: NextRequest, clock: Clock = systemClock): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { age, gender, heightCm, weightKg, goal, focusArea, startDate, totalDays, timeZone } =
    await req.json()

  // Enforce the challenge-length whitelist BEFORE any DB write. An invalid or
  // missing length is a hard 400 — never silently coerced to a default.
  const lengthResult = validateChallengeLength(totalDays)
  if (!lengthResult.ok) {
    return NextResponse.json({ error: lengthResult.error }, { status: 400 })
  }

  // Validate an explicitly-supplied start date up front (untrusted input). A
  // present-but-malformed/impossible value is a hard 400 — never silently
  // normalized (e.g. 2026-02-31). An omitted/empty value falls through to the
  // canonical default derived below, once the timezone is resolved.
  const startDateProvided = startDate !== undefined && startDate !== null && startDate !== ''
  if (startDateProvided && !isValidCivilDate(startDate)) {
    return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
  }

  await connectDB()

  // Update the profile fields. Deliberately does NOT touch timeZone here — we
  // need the currently-stored value as the resolution fallback first.
  // `.catch(() => null)` absorbs a CastError from a stale/invalid session id.
  const user = await User.findByIdAndUpdate(
    session.user.id,
    {
      age: Number(age),
      gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      goal,
      focusArea,
      onboardingComplete: true,
    },
    { new: true }
  ).catch(() => null)

  if (!user) {
    return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
  }

  // Effective timezone: valid submitted → stored user tz → DEFAULT_TIME_ZONE.
  // A valid stored tz is never overwritten by invalid/missing input.
  const submittedTz = typeof timeZone === 'string' ? timeZone : null
  const resolvedTz = resolveOnboardingTimeZone(submittedTz, user.timeZone)

  // Persist the resolved tz to the user only when it actually changes.
  if (user.timeZone !== resolvedTz) {
    user.timeZone = resolvedTz
    await user.save()
  }

  // Canonical start-date string: explicit valid value wins; otherwise the user's
  // local civil date in the resolved zone (tz-aware, no UTC off-by-one).
  const startDateStr = isValidCivilDate(startDate) ? startDate : currentDayKey(resolvedTz, clock)

  // Create-or-preserve the active challenge. Only the absent-active case creates,
  // and it always creates as v2.
  let challenge = await Challenge.findOne({ userId: session.user.id, isActive: true })
  if (!challenge) {
    try {
      challenge = await Challenge.create({
        userId: session.user.id,
        startDate: new Date(`${startDateStr}T00:00:00.000Z`),
        totalDays: lengthResult.value,
        currentDay: 1,
        currentStreak: 0,
        timeZone: resolvedTz,
        dateKeyVersion: 2,
        isActive: true,
      })
    } catch (err) {
      // Duplicate-key race: a concurrent onboarding created the active challenge
      // first (blocked by the unique partial index). Load and PRESERVE it —
      // never overwrite — and fall through to the normal success contract.
      if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
        challenge = await Challenge.findOne({ userId: session.user.id, isActive: true })
      } else {
        throw err
      }
    }
  }

  if (!challenge) {
    // Create lost the race yet the reload found nothing — fail safe rather than
    // leak internals or return a partial contract.
    return NextResponse.json({ error: 'Could not create challenge.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: String(user._id),
      username: user.username,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      goal: user.goal,
      focusArea: user.focusArea,
      startDate: challenge.startDate.toISOString().split('T')[0],
      totalDays: challenge.totalDays,
    },
  })
}

export const POST = (req: NextRequest) => onboard(req)
