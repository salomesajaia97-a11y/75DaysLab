// lib/recipes/find.test.ts
import { describe, it, expect } from 'vitest'
import { rankRecipes } from './find'
import type { WebRecipe } from './types'

const mk = (domain: string, title: string): WebRecipe => ({
  title, ingredients: ['a', 'b', 'c'], instructions: ['step'], sourceDomain: domain,
})

describe('rankRecipes', () => {
  it('boosts preferred quality/Georgian domains above generic ones', () => {
    const input = [mk('randomblog.com', 'X'), mk('eatingwell.com', 'Y'), mk('kulinaria.ge', 'Z')]
    const ranked = rankRecipes(input)
    expect(['eatingwell.com', 'kulinaria.ge']).toContain(ranked[0].sourceDomain)
    expect(ranked[ranked.length - 1].sourceDomain).toBe('randomblog.com')
  })
  it('keeps order stable among non-preferred domains', () => {
    const input = [mk('a.com', '1'), mk('b.com', '2')]
    const ranked = rankRecipes(input)
    expect(ranked.map(r => r.sourceDomain)).toEqual(['a.com', 'b.com'])
  })
})
