// lib/grocery/match.test.ts
import { describe, it, expect } from 'vitest'
import { stripToFoodTerm, buildBaskets } from './match'
import type { MatchedIngredient } from './types'

describe('stripToFoodTerm', () => {
  it('strips leading quantity and unit', () => {
    expect(stripToFoodTerm('2 large eggs')).toBe('eggs')
    expect(stripToFoodTerm('1 cup rice')).toBe('rice')
    expect(stripToFoodTerm('500 g chicken breast')).toBe('chicken breast')
    expect(stripToFoodTerm('¼ tsp salt')).toBe('salt')
  })
  it('strips parentheticals and trailing notes', () => {
    expect(stripToFoodTerm('2 cloves garlic, minced')).toBe('garlic')
    expect(stripToFoodTerm('onion (finely chopped)')).toBe('onion')
  })
  it('returns the term unchanged when no quantity', () => {
    expect(stripToFoodTerm('olive oil')).toBe('olive oil')
  })
})

describe('buildBaskets', () => {
  const items: MatchedIngredient[] = [
    { ingredient: '2 eggs', term: 'eggs', matches: [
      { retailer: 'orinabiji', productName: 'კვერცხი', price: 5, sourceUrl: 'u', scrapedAt: 'd' },
      { retailer: 'agrohub', productName: 'კვერცხი', price: 6, sourceUrl: 'u', scrapedAt: 'd' },
    ]},
    { ingredient: 'rice', term: 'rice', matches: [
      { retailer: 'orinabiji', productName: 'ბრინჯი', price: 4, sourceUrl: 'u', scrapedAt: 'd' },
    ]},
  ]
  it('sums cheapest match per retailer and flags missing', () => {
    const baskets = buildBaskets(items)
    const ori = baskets.find(b => b.retailer === 'orinabiji')!
    const agro = baskets.find(b => b.retailer === 'agrohub')!
    expect(ori.total).toBe(9)        // 5 + 4
    expect(ori.missing).toEqual([])
    expect(agro.total).toBe(6)       // only eggs
    expect(agro.missing).toEqual(['rice'])
  })
})
