import { describe, it, expect } from 'vitest'
import { nextChallengeState, addDays, type ChallengeState } from './streak'
import { buildChallengeView } from './progress'
import { ALLOWED_CHALLENGE_LENGTHS } from './validation/challenge'

// Phase 2A audit: verify every supported challenge length (30/40/55/75) computes
// currentDay, currentStreak, longestStreak, totalCompletedDays, daysRemaining,
// completion state, and reset behavior correctly. The engine is pure and
// length-parametrized; these tests pin that contract for all four lengths.

const START = '2026-07-01'

const state = (totalDays: number, over: Partial<ChallengeState> = {}): ChallengeState => ({
  startDate: START,
  totalDays,
  currentDay: 1,
  currentStreak: 0,
  longestStreak: 0,
  ...over,
})

/** Simulate a healthy run of `days` consecutive complete days from START. */
function runHealthy(totalDays: number, days: number): ChallengeState {
  let s = state(totalDays)
  for (let i = 0; i < days; i++) {
    s = nextChallengeState(s, { today: addDays(START, i), todayComplete: true })
  }
  return s
}

describe.each(ALLOWED_CHALLENGE_LENGTHS)('challenge length %d — calculations', (totalDays) => {
  it('currentDay starts at 1 and increments per elapsed day', () => {
    const day1 = nextChallengeState(state(totalDays), { today: START, todayComplete: false })
    expect(day1.currentDay).toBe(1)
    const day3 = nextChallengeState(
      state(totalDays, { lastCompletedDate: addDays(START, 1) }),
      { today: addDays(START, 2), todayComplete: true }
    )
    expect(day3.currentDay).toBe(3)
  })

  it('currentDay clamps at totalDays and never exceeds it', () => {
    // last completed just before "today", today far past the finish line
    const s = nextChallengeState(
      state(totalDays, { lastCompletedDate: addDays(START, totalDays + 4) }),
      { today: addDays(START, totalDays + 5), todayComplete: true }
    )
    expect(s.currentDay).toBe(totalDays)
    expect(s.currentDay).toBeLessThanOrEqual(totalDays)
  })

  it('currentStreak and longestStreak grow together in a healthy run', () => {
    const s = runHealthy(totalDays, 5)
    expect(s.currentStreak).toBe(5)
    expect(s.longestStreak).toBe(5)
  })

  it('reaches completion exactly on the final day', () => {
    const s = runHealthy(totalDays, totalDays)
    expect(s.currentStreak).toBe(totalDays)
    const view = buildChallengeView(s, totalDays)
    expect(view.isComplete).toBe(true)
    expect(view.daysRemaining).toBe(0)
  })

  it('is NOT complete one day before the end', () => {
    const s = runHealthy(totalDays, totalDays - 1)
    const view = buildChallengeView(s, totalDays)
    expect(view.isComplete).toBe(false)
    expect(view.currentStreak).toBe(totalDays - 1)
    expect(view.daysRemaining).toBe(1)
  })

  it('daysRemaining = totalDays - attemptDay, never negative', () => {
    const mid = Math.floor(totalDays / 2)
    const s = runHealthy(totalDays, mid)
    const view = buildChallengeView(s, totalDays)
    expect(view.daysRemaining).toBe(totalDays - view.attemptDay)
    expect(view.daysRemaining).toBeGreaterThanOrEqual(0)
  })

  it('totalCompletedDays is historical and independent of the length', () => {
    const s = runHealthy(totalDays, 3)
    // 120 verified days survives even a short challenge attempt
    const view = buildChallengeView(s, 120)
    expect(view.totalCompletedDays).toBe(120)
  })

  it('hard reset on a missed day restarts at day 1 but preserves longestStreak', () => {
    const good = runHealthy(totalDays, Math.min(10, totalDays))
    const best = good.longestStreak
    // skip a day: last completion is >1 day before "today"
    const reset = nextChallengeState(good, {
      today: addDays(good.lastCompletedDate!, 2),
      todayComplete: false,
    })
    expect(reset.currentStreak).toBe(0)
    expect(reset.currentDay).toBe(1)
    expect(reset.longestStreak).toBe(best)
    const view = buildChallengeView(reset, totalDays)
    expect(view.isComplete).toBe(false)
    expect(view.daysRemaining).toBe(totalDays - 1)
  })

  it('completion state is keyed to this length, not a hardcoded 75', () => {
    const s = runHealthy(totalDays, totalDays)
    // a streak equal to THIS length completes, even for the short challenges
    expect(buildChallengeView(s, totalDays).isComplete).toBe(true)
  })
})
