import { describe, it, expect } from 'vitest'
import { MEAL_TIME_RANGES, MEAL_ORDER } from './nutrition-meal'

describe('MEAL_TIME_RANGES', () => {
  it('has an entry for every meal in MEAL_ORDER', () => {
    for (const m of MEAL_ORDER) {
      expect(m in MEAL_TIME_RANGES).toBe(true)
    }
  })

  it('gives breakfast/lunch/dinner a time string and snack null', () => {
    expect(MEAL_TIME_RANGES.breakfast).toBe('08:00 – 10:00')
    expect(MEAL_TIME_RANGES.lunch).toBe('12:00 – 15:00')
    expect(MEAL_TIME_RANGES.dinner).toBe('18:00 – 21:00')
    expect(MEAL_TIME_RANGES.snack).toBeNull()
  })
})
