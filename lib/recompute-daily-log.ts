// Daily completion spine — DB layer (T4). Recomputes a user-day's DailyLog from
// the underlying source collections and drives the Challenge state machine.
// Imports models + the mongoose connection, so this module is NOT unit-testable
// without a database; the pure logic it depends on lives in ./daily-log and
// ./streak (both fully tested).

import mongoose from 'mongoose'
import { computeDailyFlags } from './daily-log'
import { nextChallengeState, toDateStr } from './streak'
import { connectDB } from './mongoose'
import { calculateWaterGoal } from './calculations'
import { User } from '@/models/User'
import { WaterLog } from '@/models/WaterLog'
import { JournalEntry } from '@/models/JournalEntry'
import { FoodLog } from '@/models/FoodLog'
import { Photo } from '@/models/Photo'
import { DailyLog, type IDailyLog } from '@/models/DailyLog'
import { Challenge, type IChallenge } from '@/models/Challenge'

/** Fallback water goal when the profile is too incomplete to compute one
 *  (mirrors the dashboard's FALLBACK_WATER). */
const FALLBACK_WATER_ML = 2500

interface WaterGoalSource {
  age?: number
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  goal?: 'lose' | 'gain' | 'maintain' | 'healthy'
}

function waterGoalFor(user: WaterGoalSource | null): number {
  if (!user || user.age == null || user.weightKg == null || user.heightCm == null) {
    return FALLBACK_WATER_ML
  }
  return calculateWaterGoal(
    user.age,
    user.weightKg,
    user.heightCm,
    user.gender ?? 'other',
    user.goal ?? 'maintain'
  )
}

/**
 * Advance the user's active Challenge for `date`. No-op (returns null) when the
 * user has no active challenge. Only ever called for the live UTC day so the
 * streak math stays anchored to "today".
 */
async function updateChallengeForDay(
  userId: string,
  date: string,
  todayComplete: boolean
): Promise<IChallenge | null> {
  const challenge = await Challenge.findOne({ userId, isActive: true })
  if (!challenge) return null

  const next = nextChallengeState(
    {
      startDate: toDateStr(challenge.startDate),
      totalDays: challenge.totalDays,
      currentDay: challenge.currentDay,
      currentStreak: challenge.currentStreak,
      longestStreak: challenge.longestStreak,
      lastCompletedDate: challenge.lastCompletedDate,
    },
    { today: date, todayComplete }
  )

  challenge.startDate = new Date(`${next.startDate}T00:00:00.000Z`)
  challenge.currentDay = next.currentDay
  challenge.currentStreak = next.currentStreak
  challenge.longestStreak = next.longestStreak
  challenge.set('lastCompletedDate', next.lastCompletedDate) // set/unset cleanly
  await challenge.save()

  return challenge
}

export interface RecomputeResult {
  log: IDailyLog
  challenge: IChallenge | null
}

/**
 * Optional explicit workout completion. Only the fitness API supplies this — it
 * is the sole writer of the two raw workout booleans. A field left `undefined`
 * is not written (the existing stored value is preserved), so a structured-only
 * write never clobbers a concurrent outdoor write and vice versa.
 */
export interface WorkoutOverride {
  structuredWorkoutCompleted?: boolean
  outdoorWorkoutCompleted?: boolean
}

/**
 * Recompute and persist the DailyLog for a user+date from the underlying source
 * collections, then advance the Challenge streak. Idempotent — safe to call
 * after every completion event and to re-run (self-healing).
 *
 * Notes:
 *  - Water/journal/nutrition/photo flags are DERIVED from source data here.
 *  - The raw workout booleans are only written when passed via `workout` (the
 *    fitness API); otherwise they are read-only, so ordinary recomputes never
 *    clobber a workout write.
 *  - The Challenge is advanced only when `date` is the live UTC day.
 */
export async function recomputeDailyLog(
  userId: string,
  date: string,
  workout?: WorkoutOverride
): Promise<RecomputeResult> {
  await connectDB()

  const [user, waterLogs, journal, foodLogCount, photo, existing] = await Promise.all([
    User.findById(userId).select('age gender heightCm weightKg goal').lean<WaterGoalSource>(),
    WaterLog.find({ userId, date }).select('amountMl').lean<{ amountMl: number }[]>(),
    JournalEntry.findOne({ userId, date }).select('pagesRead').lean<{ pagesRead: number } | null>(),
    FoodLog.countDocuments({ userId, date }),
    Photo.exists({ userId, date }),
    DailyLog.findOne({ userId, date })
      .select('structuredWorkoutCompleted outdoorWorkoutCompleted')
      .lean<{ structuredWorkoutCompleted?: boolean; outdoorWorkoutCompleted?: boolean } | null>(),
  ])

  const waterMl = waterLogs.reduce((sum, l) => sum + (l.amountMl ?? 0), 0)

  // Effective workout flags: an explicit override wins, else keep the stored value.
  const structuredWorkoutCompleted =
    workout?.structuredWorkoutCompleted ?? existing?.structuredWorkoutCompleted ?? false
  const outdoorWorkoutCompleted =
    workout?.outdoorWorkoutCompleted ?? existing?.outdoorWorkoutCompleted ?? false

  const flags = computeDailyFlags({
    waterMl,
    waterGoalMl: waterGoalFor(user),
    journalPagesRead: journal?.pagesRead ?? null,
    foodLogCount,
    photoExists: Boolean(photo),
    structuredWorkoutCompleted,
    outdoorWorkoutCompleted,
  })

  // Source-derived flags + derived rollups. Raw workout booleans are written
  // only when explicitly provided via `workout` (fitness API).
  const update: Record<string, boolean> = {
    waterCompleted: flags.waterCompleted,
    journalCompleted: flags.journalCompleted,
    nutritionCompleted: flags.nutritionCompleted,
    photoUploaded: flags.photoUploaded,
    workoutCompleted: flags.workoutCompleted,
    allComplete: flags.allComplete,
  }
  if (workout?.structuredWorkoutCompleted !== undefined)
    update.structuredWorkoutCompleted = workout.structuredWorkoutCompleted
  if (workout?.outdoorWorkoutCompleted !== undefined)
    update.outdoorWorkoutCompleted = workout.outdoorWorkoutCompleted

  const log = await upsertDailyLog(userId, date, update)

  const todayStr = toDateStr(new Date())
  const challenge =
    date === todayStr ? await updateChallengeForDay(userId, date, flags.allComplete) : null

  return { log, challenge }
}

/**
 * Atomic upsert on the unique {userId,date} index. Retries once on a duplicate-
 * key race (two concurrent inserts of the same day).
 */
async function upsertDailyLog(
  userId: string,
  date: string,
  update: Record<string, boolean>
): Promise<IDailyLog> {
  const filter = { userId, date }
  try {
    const doc = await DailyLog.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    if (doc) return doc
  } catch (err) {
    if (!(err instanceof mongoose.mongo.MongoServerError && err.code === 11000)) throw err
    // Lost the insert race — fall through to a plain update on the now-existing doc.
  }

  const doc = await DailyLog.findOneAndUpdate(filter, { $set: update }, { new: true })
  if (!doc) throw new Error(`DailyLog upsert failed for ${userId} ${date}`)
  return doc
}
