import { describe, it, expect } from 'vitest'
import {
  isWorkoutComplete,
  computeAllComplete,
  isDayComplete,
  toDateStr,
  addDays,
  diffDays,
  isAttemptBroken,
  nextChallengeState,
  type DailyCompletionFlags,
  type ChallengeState,
} from './streak'

const allTrue: DailyCompletionFlags = {
  waterCompleted: true,
  journalCompleted: true,
  nutritionCompleted: true,
  structuredWorkoutCompleted: true,
  outdoorWorkoutCompleted: true,
  photoUploaded: true,
}

describe('isWorkoutComplete', () => {
  it('requires BOTH structured and outdoor', () => {
    expect(isWorkoutComplete({ structuredWorkoutCompleted: true, outdoorWorkoutCompleted: true })).toBe(true)
    expect(isWorkoutComplete({ structuredWorkoutCompleted: true, outdoorWorkoutCompleted: false })).toBe(false)
    expect(isWorkoutComplete({ structuredWorkoutCompleted: false, outdoorWorkoutCompleted: true })).toBe(false)
  })
})

describe('computeAllComplete / isDayComplete', () => {
  it('true only when all six flags are satisfied', () => {
    expect(computeAllComplete(allTrue)).toBe(true)
    expect(isDayComplete(allTrue)).toBe(true)
  })

  it('false when any single task is missing', () => {
    for (const key of Object.keys(allTrue) as (keyof DailyCompletionFlags)[]) {
      expect(computeAllComplete({ ...allTrue, [key]: false })).toBe(false)
    }
  })

  it('false when only one of two workouts is done', () => {
    expect(computeAllComplete({ ...allTrue, outdoorWorkoutCompleted: false })).toBe(false)
  })
})

describe('date helpers', () => {
  it('toDateStr strips the time component (UTC)', () => {
    expect(toDateStr(new Date('2026-07-05T18:30:00.000Z'))).toBe('2026-07-05')
  })

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-07-05', 1)).toBe('2026-07-06')
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-07-05', -1)).toBe('2026-07-04')
  })

  it('diffDays returns signed whole-day difference', () => {
    expect(diffDays('2026-07-05', '2026-07-05')).toBe(0)
    expect(diffDays('2026-07-05', '2026-07-08')).toBe(3)
    expect(diffDays('2026-07-08', '2026-07-05')).toBe(-3)
  })
})

const base = (over: Partial<ChallengeState> = {}): ChallengeState => ({
  startDate: '2026-07-01',
  totalDays: 75,
  currentDay: 1,
  currentStreak: 0,
  longestStreak: 0,
  ...over,
})

describe('isAttemptBroken', () => {
  it('fresh challenge on its start day is not broken', () => {
    expect(isAttemptBroken(base({ startDate: '2026-07-05' }), '2026-07-05')).toBe(false)
  })

  it('never-completed start day now in the past is broken', () => {
    expect(isAttemptBroken(base({ startDate: '2026-07-04' }), '2026-07-05')).toBe(true)
  })

  it('completed yesterday is not broken today', () => {
    expect(isAttemptBroken(base({ lastCompletedDate: '2026-07-04' }), '2026-07-05')).toBe(false)
  })

  it('last completion more than one day ago is broken', () => {
    expect(isAttemptBroken(base({ lastCompletedDate: '2026-07-03' }), '2026-07-05')).toBe(true)
  })

  it('completed today is not broken', () => {
    expect(isAttemptBroken(base({ lastCompletedDate: '2026-07-05' }), '2026-07-05')).toBe(false)
  })
})

describe('nextChallengeState', () => {
  it('day 1 in progress (nothing complete) → streak 0, day 1', () => {
    const s = nextChallengeState(base({ startDate: '2026-07-05' }), {
      today: '2026-07-05',
      todayComplete: false,
    })
    expect(s.currentStreak).toBe(0)
    expect(s.currentDay).toBe(1)
    expect(s.startDate).toBe('2026-07-05')
  })

  it('completing day 1 → streak 1, longest 1, lastCompletedDate set', () => {
    const s = nextChallengeState(base({ startDate: '2026-07-05' }), {
      today: '2026-07-05',
      todayComplete: true,
    })
    expect(s.currentStreak).toBe(1)
    expect(s.longestStreak).toBe(1)
    expect(s.lastCompletedDate).toBe('2026-07-05')
    expect(s.currentDay).toBe(1)
  })

  it('day 2 in progress after completing day 1 → streak stays 1, day 2', () => {
    const s = nextChallengeState(
      base({ startDate: '2026-07-05', currentStreak: 1, longestStreak: 1, lastCompletedDate: '2026-07-05' }),
      { today: '2026-07-06', todayComplete: false }
    )
    expect(s.currentStreak).toBe(1)
    expect(s.currentDay).toBe(2)
    expect(s.startDate).toBe('2026-07-05')
  })

  it('completing day 2 → streak 2', () => {
    const s = nextChallengeState(
      base({ startDate: '2026-07-05', currentStreak: 1, longestStreak: 1, lastCompletedDate: '2026-07-05' }),
      { today: '2026-07-06', todayComplete: true }
    )
    expect(s.currentStreak).toBe(2)
    expect(s.longestStreak).toBe(2)
    expect(s.currentDay).toBe(2)
  })

  it('is idempotent when re-evaluated the same day', () => {
    const first = nextChallengeState(base({ startDate: '2026-07-05' }), {
      today: '2026-07-05',
      todayComplete: true,
    })
    const second = nextChallengeState(first, { today: '2026-07-05', todayComplete: true })
    expect(second.currentStreak).toBe(first.currentStreak)
    expect(second.longestStreak).toBe(first.longestStreak)
    expect(second.startDate).toBe(first.startDate)
  })

  it('missed yesterday → hard reset to day 1 today', () => {
    // completed through 07-05, skipped 07-06, open app 07-07
    const s = nextChallengeState(
      base({ startDate: '2026-07-01', currentStreak: 5, longestStreak: 5, lastCompletedDate: '2026-07-05' }),
      { today: '2026-07-07', todayComplete: false }
    )
    expect(s.startDate).toBe('2026-07-07')
    expect(s.currentStreak).toBe(0)
    expect(s.currentDay).toBe(1)
    expect(s.longestStreak).toBe(5) // preserved
    expect(s.lastCompletedDate).toBeUndefined()
  })

  it('reset then completing the restart day → streak 1', () => {
    const s = nextChallengeState(
      base({ startDate: '2026-07-01', currentStreak: 5, longestStreak: 5, lastCompletedDate: '2026-07-05' }),
      { today: '2026-07-07', todayComplete: true }
    )
    expect(s.startDate).toBe('2026-07-07')
    expect(s.currentStreak).toBe(1)
    expect(s.longestStreak).toBe(5)
  })

  it('never completed day 1, opens day 2 → reset to day 2', () => {
    const s = nextChallengeState(base({ startDate: '2026-07-05' }), {
      today: '2026-07-06',
      todayComplete: false,
    })
    expect(s.startDate).toBe('2026-07-06')
    expect(s.currentStreak).toBe(0)
    expect(s.currentDay).toBe(1)
  })

  it('interior gap caught on completion (missed a middle day)', () => {
    // completed 07-01, missed 07-02, modules auto-complete 07-03 without app open
    const s = nextChallengeState(
      base({ startDate: '2026-07-01', currentStreak: 1, longestStreak: 1, lastCompletedDate: '2026-07-01' }),
      { today: '2026-07-03', todayComplete: true }
    )
    expect(s.startDate).toBe('2026-07-03') // lapsed → restart
    expect(s.currentStreak).toBe(1)
  })

  it('clamps currentDay to totalDays', () => {
    const s = nextChallengeState(
      base({ startDate: '2026-07-01', totalDays: 75, lastCompletedDate: '2026-09-30' }),
      { today: '2026-10-01', todayComplete: true }
    )
    expect(s.currentDay).toBe(75)
  })

  // Data-integrity regression (P1): a missed-day hard reset must NOT erase the
  // user's best/history — longestStreak is authoritative server state and is
  // preserved even as the current attempt restarts at day 1.
  it('preserves longestStreak across a missed-day hard reset', () => {
    const s = nextChallengeState(
      base({
        startDate: '2026-06-01',
        currentDay: 33,
        currentStreak: 32,
        longestStreak: 33,
        lastCompletedDate: '2026-07-02', // >1 day before today → attempt broken
      }),
      { today: '2026-07-22', todayComplete: false }
    )
    expect(s.currentStreak).toBe(0) // current attempt reset
    expect(s.currentDay).toBe(1)
    expect(s.startDate).toBe('2026-07-22')
    expect(s.longestStreak).toBe(33) // best history NOT lost
  })
})
