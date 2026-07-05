import { describe, it, expect } from 'vitest'
import { computeDailyFlags, JOURNAL_MIN_PAGES, type DailyFlagInputs } from './daily-log'

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
})
