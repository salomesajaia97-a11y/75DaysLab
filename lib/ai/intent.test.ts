// lib/ai/intent.test.ts
import { describe, it, expect } from 'vitest'
import { classifyIntent, parsePantryItems, extractPriceTerm } from './intent'

describe('classifyIntent', () => {
  it('detects grocery price questions', () => {
    expect(classifyIntent('where can I buy eggs cheapest?')).toBe('grocery_price')
    expect(classifyIntent('cheapest price for chicken')).toBe('grocery_price')
  })
  it('detects pantry-cooking questions', () => {
    expect(classifyIntent('I have eggs, rice and onion at home, what can I cook?')).toBe('cook_from_pantry')
    expect(classifyIntent('what can I make with chicken and potato')).toBe('cook_from_pantry')
  })
  it('detects recipe requests', () => {
    expect(classifyIntent('recipe for shakshuka')).toBe('recipe_web')
    expect(classifyIntent('how do I make khachapuri')).toBe('recipe_web')
  })
  it('falls back to chat', () => {
    expect(classifyIntent('how many pushups should I do today?')).toBe('chat')
  })
})

describe('parsePantryItems', () => {
  it('extracts a comma/and separated list after "I have"', () => {
    expect(parsePantryItems('I have eggs, rice and onion at home')).toEqual(['eggs', 'rice', 'onion'])
  })
  it('handles "make with X and Y"', () => {
    expect(parsePantryItems('what can I make with chicken and potato')).toEqual(['chicken', 'potato'])
  })
})

describe('extractPriceTerm', () => {
  it('pulls the food term out of a price question', () => {
    expect(extractPriceTerm('where can I buy eggs cheapest?')).toBe('eggs')
    expect(extractPriceTerm('cheapest price for chicken breast')).toBe('chicken breast')
  })
})
