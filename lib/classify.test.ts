import { describe, it, expect } from 'vitest'
import { classifyRecipe } from './classify'

describe('classifyRecipe', () => {
  it('counts ingredients from the array length', () => {
    expect(classifyRecipe({ ingredients: ['a', 'b', 'c'] }).ingredientCount).toBe(3)
  })

  it('leaves ingredientCount undefined when no ingredients', () => {
    expect(classifyRecipe({}).ingredientCount).toBeUndefined()
  })

  it('detects one-pot from title keywords', () => {
    expect(classifyRecipe({ title: 'One Pot Creamy Pasta' }).isOnePot).toBe(true)
    expect(classifyRecipe({ title: 'Sheet Pan Salmon' }).isOnePot).toBe(true)
    expect(classifyRecipe({ tags: ['one-bowl', 'easy'] }).isOnePot).toBe(true)
  })

  it('does not flag one-pot for unrelated recipes', () => {
    expect(classifyRecipe({ title: 'Layered Lasagna', tags: ['baked'] }).isOnePot).toBe(false)
  })

  it('maps schema.org suitableForDiet IRIs to diet tags', () => {
    const r = classifyRecipe({ suitableForDiet: 'https://schema.org/VeganDiet' })
    expect(r.dietTags).toContain('vegan')
    expect(r.dietTags).toContain('plant-forward')
  })

  it('extracts diet tags from keywords and dedups', () => {
    const r = classifyRecipe({ title: 'Vegan Gluten-Free Brownies', tags: ['dairy free', 'whole food'] })
    expect(r.dietTags).toEqual(expect.arrayContaining(['vegan', 'gluten-free', 'dairy-free', 'whole-food', 'plant-forward']))
    expect(new Set(r.dietTags).size).toBe(r.dietTags.length)
  })

  it('adds plant-forward when vegetarian present', () => {
    expect(classifyRecipe({ tags: ['vegetarian'] }).dietTags).toContain('plant-forward')
  })

  it('returns empty dietTags for an omnivore recipe', () => {
    expect(classifyRecipe({ title: 'Grilled Chicken', tags: ['dinner'] }).dietTags).toEqual([])
  })
})
