import { describe, it, expect } from 'vitest'
import { percentComplete, dayStatusFromTasks, summarizeDay, type DayStatus } from './day-status'
import type { CanonicalTasks } from './daily-log'

const OFF: CanonicalTasks = {
  waterCompleted: false,
  journalCompleted: false,
  nutritionCompleted: false,
  workoutCompleted: false,
  photoUploaded: false,
}
const keys = Object.keys(OFF) as (keyof CanonicalTasks)[]

/** Tasks object with the first `n` tasks completed. */
function withCount(n: number): CanonicalTasks {
  const t = { ...OFF }
  for (let i = 0; i < n; i++) t[keys[i]] = true
  return t
}

describe('percentComplete', () => {
  const table: Array<[number, number]> = [
    [0, 0],
    [1, 20],
    [2, 40],
    [3, 60],
    [4, 80],
    [5, 100],
  ]
  for (const [count, pct] of table) {
    it(`${count}/5 → ${pct}%`, () => {
      expect(percentComplete(count)).toBe(pct)
    })
  }

  it('clamps out-of-range counts', () => {
    expect(percentComplete(-1)).toBe(0)
    expect(percentComplete(9)).toBe(100)
  })
})

describe('dayStatusFromTasks', () => {
  const table: Array<[number, DayStatus]> = [
    [0, 'incomplete'],
    [1, 'incomplete'],
    [2, 'incomplete'],
    [3, 'completed'],
    [4, 'completed'],
    [5, 'perfect'],
  ]
  for (const [count, status] of table) {
    it(`${count}/5 → ${status}`, () => {
      expect(dayStatusFromTasks(withCount(count))).toBe(status)
    })
  }
})

describe('summarizeDay', () => {
  it('summarizes a recorded perfect day', () => {
    expect(summarizeDay('2026-07-20', withCount(5))).toEqual({
      date: '2026-07-20',
      hasRecord: true,
      completedTaskCount: 5,
      totalTasks: 5,
      percent: 100,
      status: 'perfect',
    })
  })

  it('summarizes a recorded completed (3/5) day', () => {
    const s = summarizeDay('2026-07-21', withCount(3))
    expect(s).toMatchObject({ hasRecord: true, completedTaskCount: 3, percent: 60, status: 'completed' })
  })

  it('summarizes a recorded incomplete (2/5) day', () => {
    const s = summarizeDay('2026-07-22', withCount(2))
    expect(s).toMatchObject({ hasRecord: true, completedTaskCount: 2, percent: 40, status: 'incomplete' })
  })

  it('marks a day with no record as hasRecord:false / zeroed', () => {
    expect(summarizeDay('2026-07-23', null)).toEqual({
      date: '2026-07-23',
      hasRecord: false,
      completedTaskCount: 0,
      totalTasks: 5,
      percent: 0,
      status: 'incomplete',
    })
  })

  it('is deterministic', () => {
    expect(summarizeDay('2026-07-20', withCount(4))).toEqual(summarizeDay('2026-07-20', withCount(4)))
  })
})
