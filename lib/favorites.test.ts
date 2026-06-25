import { describe, it, expect } from 'vitest'
import { aggregateFavorites } from './favorites'

describe('aggregateFavorites', () => {
  it('groups by normalized description and counts occurrences', () => {
    const out = aggregateFavorites([
      { description: 'Oatmeal', calories: 300, proteinG: 10, carbsG: 50, fatG: 5, loggedAt: '2026-06-20T08:00:00Z' },
      { description: ' oatmeal ', calories: 320, proteinG: 11, carbsG: 52, fatG: 6, loggedAt: '2026-06-22T08:00:00Z' },
      { description: 'Eggs', calories: 150, proteinG: 12, carbsG: 1, fatG: 10, loggedAt: '2026-06-21T08:00:00Z' },
    ])
    expect(out).toHaveLength(2)
    const oat = out.find(f => f.description.toLowerCase().trim() === 'oatmeal')!
    expect(oat.count).toBe(2)
    // macros come from the most recent row in the group
    expect(oat.calories).toBe(320)
    expect(oat.lastLoggedAt).toBe('2026-06-22T08:00:00.000Z')
  })

  it('orders by count desc then recency, and respects limit', () => {
    const out = aggregateFavorites(
      [
        { description: 'A', loggedAt: '2026-06-01T00:00:00Z' },
        { description: 'B', loggedAt: '2026-06-10T00:00:00Z' },
        { description: 'B', loggedAt: '2026-06-11T00:00:00Z' },
        { description: 'C', loggedAt: '2026-06-12T00:00:00Z' },
      ],
      2,
    )
    expect(out.map(f => f.description)).toEqual(['B', 'C'])
  })

  it('skips blank descriptions and defaults missing macros to 0', () => {
    const out = aggregateFavorites([
      { description: '   ', calories: 100, loggedAt: '2026-06-01T00:00:00Z' },
      { description: 'Soup', loggedAt: '2026-06-02T00:00:00Z' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].description).toBe('Soup')
    expect(out[0]).toMatchObject({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  })
})
