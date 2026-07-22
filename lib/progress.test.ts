import { describe, it, expect } from 'vitest'
import { isValidDayString, isFutureDay, buildChallengeView, EMPTY_CHALLENGE_VIEW } from './progress'

describe('isValidDayString', () => {
  it('accepts a real YYYY-MM-DD date', () => {
    expect(isValidDayString('2026-07-22')).toBe(true)
    expect(isValidDayString('2026-02-29')).toBe(false) // 2026 not a leap year
    expect(isValidDayString('2024-02-29')).toBe(true) // 2024 is
  })
  it('rejects malformed strings', () => {
    for (const s of ['', '2026-7-22', '2026/07/22', 'not-a-date', '20260722', '2026-13-01', '2026-00-10', '2026-07-32'])
      expect(isValidDayString(s)).toBe(false)
  })
})

describe('isFutureDay', () => {
  it('is true only when the day is strictly after today', () => {
    expect(isFutureDay('2026-07-23', '2026-07-22')).toBe(true)
    expect(isFutureDay('2026-07-22', '2026-07-22')).toBe(false)
    expect(isFutureDay('2026-07-21', '2026-07-22')).toBe(false)
  })
})

describe('buildChallengeView', () => {
  it('carries the selected challenge length and labels values distinctly', () => {
    const v = buildChallengeView(
      { totalDays: 55, currentDay: 12, currentStreak: 11, longestStreak: 33 },
      40 // historical verified completed days
    )
    expect(v.totalDays).toBe(55)
    expect(v.attemptDay).toBe(12)
    expect(v.currentStreak).toBe(11)
    expect(v.longestStreak).toBe(33)
    expect(v.totalCompletedDays).toBe(40)
    expect(v.daysRemaining).toBe(43) // 55 - 12
    expect(v.isComplete).toBe(false)
  })

  it('marks complete only when the current streak reaches the selected length', () => {
    expect(buildChallengeView({ totalDays: 30, currentDay: 30, currentStreak: 30, longestStreak: 30 }, 30).isComplete).toBe(true)
    expect(buildChallengeView({ totalDays: 75, currentDay: 75, currentStreak: 74, longestStreak: 74 }, 74).isComplete).toBe(false)
  })

  it('never returns negative daysRemaining', () => {
    const v = buildChallengeView({ totalDays: 30, currentDay: 30, currentStreak: 30, longestStreak: 30 }, 30)
    expect(v.daysRemaining).toBe(0)
  })

  it('after a missed-day reset (attempt Day 1) still exposes preserved history', () => {
    // current attempt restarted, but longest streak + completed-day history survive
    const v = buildChallengeView({ totalDays: 75, currentDay: 1, currentStreak: 0, longestStreak: 33 }, 33)
    expect(v.attemptDay).toBe(1)
    expect(v.currentStreak).toBe(0)
    expect(v.longestStreak).toBe(33) // preserved
    expect(v.totalCompletedDays).toBe(33) // preserved
  })

  it('EMPTY_CHALLENGE_VIEW is a safe zero state', () => {
    expect(EMPTY_CHALLENGE_VIEW.attemptDay).toBe(1)
    expect(EMPTY_CHALLENGE_VIEW.currentStreak).toBe(0)
    expect(EMPTY_CHALLENGE_VIEW.isComplete).toBe(false)
  })
})
