import { describe, it, expect } from 'vitest'
import { computeDailyFlags, type DailyFlagInputs } from './daily-log'
import { nextChallengeState, type ChallengeState } from './streak'

// Pure-boundary integration for the completion-threshold feature. recompute-
// daily-log.ts wires the two pure layers exactly like this:
//   todayComplete = computeDailyFlags(sources).isCompletedDay
//   next          = nextChallengeState(state, { today, todayComplete })
// The DB wrapper itself is not unit-testable (needs Mongo); this pins the wiring
// contract — that a Completed Day (>= 3 tasks), NOT a Perfect Day, drives the
// streak, and that Perfect never double-counts.

const complete: DailyFlagInputs = {
  waterMl: 2500,
  waterGoalMl: 2500,
  journalPagesRead: 10,
  foodLogCount: 2,
  photoExists: true,
  structuredWorkoutCompleted: true,
  outdoorWorkoutCompleted: true,
}

/** Source inputs that yield exactly `n` of the 5 tasks (drops in a fixed order:
 *  photo, workout(outdoor), nutrition, journal, water). */
function sourcesForCount(n: number): DailyFlagInputs {
  const i = { ...complete }
  if (n < 5) i.photoExists = false
  if (n < 4) i.outdoorWorkoutCompleted = false // drops the single workout task
  if (n < 3) i.foodLogCount = 0
  if (n < 2) i.journalPagesRead = null
  if (n < 1) i.waterMl = 0
  return i
}

const todayCompleteFor = (n: number) => computeDailyFlags(sourcesForCount(n)).isCompletedDay

const base = (over: Partial<ChallengeState> = {}): ChallengeState => ({
  startDate: '2026-07-05',
  totalDays: 75,
  currentDay: 1,
  currentStreak: 0,
  longestStreak: 0,
  ...over,
})

describe('completion threshold ↔ streak wiring', () => {
  it('a 2/5 day does NOT continue the completed-day streak', () => {
    expect(todayCompleteFor(2)).toBe(false)
    const s = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(2) })
    expect(s.currentStreak).toBe(0)
    expect(s.lastCompletedDate).toBeUndefined()
  })

  it('a 3/5 day continues the completed-day streak (advances once)', () => {
    expect(todayCompleteFor(3)).toBe(true)
    const s = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(3) })
    expect(s.currentStreak).toBe(1)
    expect(s.currentDay).toBe(1)
    expect(s.lastCompletedDate).toBe('2026-07-05')
  })

  it('a 5/5 (perfect) day continues the SAME normal streak — only once', () => {
    const s = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(5) })
    expect(s.currentStreak).toBe(1)
  })

  it('3/5 → 5/5 upgrade the same day does not advance the streak again', () => {
    const afterThree = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(3) })
    const afterFive = nextChallengeState(afterThree, { today: '2026-07-05', todayComplete: todayCompleteFor(5) })
    expect(afterFive.currentStreak).toBe(afterThree.currentStreak) // 1, not 2
    expect(afterFive.currentDay).toBe(afterThree.currentDay)
  })

  it('repeated recompute of a 3/5 day is idempotent (no duplicate progress)', () => {
    const a = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(3) })
    const b = nextChallengeState(a, { today: '2026-07-05', todayComplete: todayCompleteFor(3) })
    expect(b.currentStreak).toBe(a.currentStreak)
    expect(b.longestStreak).toBe(a.longestStreak)
    expect(b.startDate).toBe(a.startDate)
  })

  it('repeated recompute of a 5/5 day is idempotent (no duplicate progress)', () => {
    const a = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(5) })
    const b = nextChallengeState(a, { today: '2026-07-05', todayComplete: todayCompleteFor(5) })
    expect(b.currentStreak).toBe(a.currentStreak)
    expect(b.longestStreak).toBe(a.longestStreak)
  })

  it('5/5 → 4/5 same day: still completed, streak unchanged for the day', () => {
    const perfect = nextChallengeState(base(), { today: '2026-07-05', todayComplete: todayCompleteFor(5) })
    // dropping to 4/5 is still a Completed Day, so today still counts
    expect(todayCompleteFor(4)).toBe(true)
    const four = nextChallengeState(perfect, { today: '2026-07-05', todayComplete: todayCompleteFor(4) })
    expect(four.currentStreak).toBe(perfect.currentStreak)
    expect(four.lastCompletedDate).toBe('2026-07-05')
  })

  it('consecutive 3/5, 4/5, 5/5 days build a three-day streak', () => {
    const d1 = nextChallengeState(base({ startDate: '2026-07-05' }), {
      today: '2026-07-05',
      todayComplete: todayCompleteFor(3),
    })
    const d2 = nextChallengeState(d1, { today: '2026-07-06', todayComplete: todayCompleteFor(4) })
    const d3 = nextChallengeState(d2, { today: '2026-07-07', todayComplete: todayCompleteFor(5) })
    expect(d1.currentStreak).toBe(1)
    expect(d2.currentStreak).toBe(2)
    expect(d3.currentStreak).toBe(3)
    expect(d3.currentDay).toBe(3)
  })

  it('final challenge day completed at 3/5 finalizes exactly once', () => {
    // 2-day challenge: day 1 done, on day 2 a 3/5 day reaches currentStreak === totalDays
    const twoDay = base({ totalDays: 2, startDate: '2026-07-05' })
    const d1 = nextChallengeState(twoDay, { today: '2026-07-05', todayComplete: todayCompleteFor(3) })
    const d2 = nextChallengeState(d1, { today: '2026-07-06', todayComplete: todayCompleteFor(3) })
    expect(d2.currentStreak).toBe(2)
    expect(d2.currentStreak >= d2.totalDays).toBe(true) // isComplete
    // re-running the final day does not push it past totalDays
    const again = nextChallengeState(d2, { today: '2026-07-06', todayComplete: todayCompleteFor(3) })
    expect(again.currentStreak).toBe(2)
    expect(again.currentDay).toBe(2)
  })
})
