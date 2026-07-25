import { describe, it, expect } from 'vitest'
import {
  computeDailyFlags,
  computeDayResult,
  COMPLETED_DAY_THRESHOLD,
  DAILY_TASK_COUNT,
  JOURNAL_MIN_PAGES,
  type CanonicalTasks,
  type DailyFlagInputs,
} from './daily-log'

const complete: DailyFlagInputs = {
  waterMl: 2500,
  waterGoalMl: 2500,
  journalPagesRead: 10,
  foodLogCount: 2,
  photoExists: true,
  structuredWorkoutCompleted: true,
  outdoorWorkoutCompleted: true,
}

describe('computeDailyFlags', () => {
  it('derives all flags true for a fully-complete day', () => {
    const f = computeDailyFlags(complete)
    expect(f).toMatchObject({
      waterCompleted: true,
      journalCompleted: true,
      nutritionCompleted: true,
      structuredWorkoutCompleted: true,
      outdoorWorkoutCompleted: true,
      photoUploaded: true,
      workoutCompleted: true,
      allComplete: true,
    })
  })

  describe('water', () => {
    it('complete only when total meets the goal', () => {
      expect(computeDailyFlags({ ...complete, waterMl: 2499 }).waterCompleted).toBe(false)
      expect(computeDailyFlags({ ...complete, waterMl: 2500 }).waterCompleted).toBe(true)
      expect(computeDailyFlags({ ...complete, waterMl: 3000 }).waterCompleted).toBe(true)
    })

    it('never complete when the goal is zero/unknown', () => {
      expect(computeDailyFlags({ ...complete, waterGoalMl: 0, waterMl: 5000 }).waterCompleted).toBe(false)
    })
  })

  describe('journal', () => {
    it('requires an entry with at least the minimum pages', () => {
      expect(computeDailyFlags({ ...complete, journalPagesRead: null }).journalCompleted).toBe(false)
      expect(computeDailyFlags({ ...complete, journalPagesRead: JOURNAL_MIN_PAGES - 1 }).journalCompleted).toBe(false)
      expect(computeDailyFlags({ ...complete, journalPagesRead: JOURNAL_MIN_PAGES }).journalCompleted).toBe(true)
    })
  })

  describe('nutrition', () => {
    it('complete with at least one food log', () => {
      expect(computeDailyFlags({ ...complete, foodLogCount: 0 }).nutritionCompleted).toBe(false)
      expect(computeDailyFlags({ ...complete, foodLogCount: 1 }).nutritionCompleted).toBe(true)
    })
  })

  describe('workout (75 Hard = both sessions)', () => {
    it('workoutCompleted requires structured AND outdoor', () => {
      expect(computeDailyFlags({ ...complete, outdoorWorkoutCompleted: false }).workoutCompleted).toBe(false)
      expect(computeDailyFlags({ ...complete, structuredWorkoutCompleted: false }).workoutCompleted).toBe(false)
    })

    it('a single missing workout blocks allComplete', () => {
      expect(computeDailyFlags({ ...complete, outdoorWorkoutCompleted: false }).allComplete).toBe(false)
    })
  })

  describe('photo', () => {
    it('requires a photo for the day', () => {
      expect(computeDailyFlags({ ...complete, photoExists: false }).photoUploaded).toBe(false)
      expect(computeDailyFlags({ ...complete, photoExists: false }).allComplete).toBe(false)
    })
  })

  it('allComplete is false when any one input fails', () => {
    expect(computeDailyFlags({ ...complete, waterMl: 0 }).allComplete).toBe(false)
    expect(computeDailyFlags({ ...complete, journalPagesRead: null }).allComplete).toBe(false)
    expect(computeDailyFlags({ ...complete, foodLogCount: 0 }).allComplete).toBe(false)
    expect(computeDailyFlags({ ...complete, photoExists: false }).allComplete).toBe(false)
  })

  describe('day-result thresholds (Completed >= 3, Perfect === 5)', () => {
    it('exposes completedTaskCount / isCompletedDay / isPerfectDay for a perfect day', () => {
      const f = computeDailyFlags(complete)
      expect(f.completedTaskCount).toBe(5)
      expect(f.isCompletedDay).toBe(true)
      expect(f.isPerfectDay).toBe(true)
    })

    it('isPerfectDay always equals allComplete', () => {
      // sweep a few representative combinations
      const cases: DailyFlagInputs[] = [
        complete,
        { ...complete, waterMl: 0 },
        { ...complete, outdoorWorkoutCompleted: false },
        { ...complete, waterMl: 0, foodLogCount: 0 },
      ]
      for (const c of cases) {
        const f = computeDailyFlags(c)
        expect(f.isPerfectDay).toBe(f.allComplete)
      }
    })

    it('a 3/5 day (one workout session missing → workout task off, one other off) is completed but not perfect', () => {
      // drop workout (both) + photo → 3 of 5 remain (water, journal, nutrition)
      const f = computeDailyFlags({ ...complete, outdoorWorkoutCompleted: false, photoExists: false })
      expect(f.completedTaskCount).toBe(3)
      expect(f.isCompletedDay).toBe(true)
      expect(f.isPerfectDay).toBe(false)
    })

    it('a 4/5 day is completed but not perfect', () => {
      const f = computeDailyFlags({ ...complete, photoExists: false })
      expect(f.completedTaskCount).toBe(4)
      expect(f.isCompletedDay).toBe(true)
      expect(f.isPerfectDay).toBe(false)
    })

    it('a 2/5 day is incomplete', () => {
      // keep water + journal; drop nutrition, workout, photo
      const f = computeDailyFlags({
        ...complete,
        foodLogCount: 0,
        outdoorWorkoutCompleted: false,
        photoExists: false,
      })
      expect(f.completedTaskCount).toBe(2)
      expect(f.isCompletedDay).toBe(false)
      expect(f.isPerfectDay).toBe(false)
    })
  })
})

describe('computeDayResult (canonical threshold calc)', () => {
  const OFF: CanonicalTasks = {
    waterCompleted: false,
    journalCompleted: false,
    nutritionCompleted: false,
    workoutCompleted: false,
    photoUploaded: false,
  }
  const keys = Object.keys(OFF) as (keyof CanonicalTasks)[]

  /** Build a tasks object with the first `n` tasks completed. */
  const withCount = (n: number): CanonicalTasks => {
    const t = { ...OFF }
    for (let i = 0; i < n; i++) t[keys[i]] = true
    return t
  }

  it('constants match the product rules', () => {
    expect(COMPLETED_DAY_THRESHOLD).toBe(3)
    expect(DAILY_TASK_COUNT).toBe(5)
  })

  const truthTable: Array<[number, boolean, boolean]> = [
    [0, false, false],
    [1, false, false],
    [2, false, false],
    [3, true, false],
    [4, true, false],
    [5, true, true],
  ]

  for (const [count, completed, perfect] of truthTable) {
    it(`${count}/5 → completed=${completed}, perfect=${perfect}`, () => {
      const r = computeDayResult(withCount(count))
      expect(r.completedTaskCount).toBe(count)
      expect(r.isCompletedDay).toBe(completed)
      expect(r.isPerfectDay).toBe(perfect)
    })
  }

  it('perfect implies completed', () => {
    const r = computeDayResult(withCount(5))
    expect(r.isPerfectDay && r.isCompletedDay).toBe(true)
  })

  it('is deterministic — repeated calls give identical results', () => {
    const tasks = withCount(4)
    expect(computeDayResult(tasks)).toEqual(computeDayResult(tasks))
  })

  it('count is independent of WHICH three tasks are done', () => {
    // every distinct triple of the five tasks is a Completed (not Perfect) day
    for (let a = 0; a < keys.length; a++)
      for (let b = a + 1; b < keys.length; b++)
        for (let c = b + 1; c < keys.length; c++) {
          const t = { ...OFF }
          t[keys[a]] = true; t[keys[b]] = true; t[keys[c]] = true
          const r = computeDayResult(t)
          expect(r.completedTaskCount).toBe(3)
          expect(r.isCompletedDay).toBe(true)
          expect(r.isPerfectDay).toBe(false)
        }
  })
})
