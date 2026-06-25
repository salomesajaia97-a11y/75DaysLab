// lib/recipes/find.ts
import { searchRecipeUrls } from './websearch'
import { extractRecipe } from './extract'
import type { WebRecipe } from './types'

const PREFERRED = ['eatingwell.com', 'nutrition.gov', 'kulinaria.ge', 'seriouseats.com', 'allrecipes.com', 'skinnytaste.com']

function score(domain: string): number {
  const idx = PREFERRED.findIndex(d => domain === d || domain.endsWith('.' + d))
  return idx === -1 ? 0 : PREFERRED.length - idx   // higher = more preferred
}

export function rankRecipes(recipes: WebRecipe[]): WebRecipe[] {
  // stable sort: preferred domains first (by preference order), others keep input order
  return recipes
    .map((r, i) => ({ r, i, s: score(r.sourceDomain) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.r)
}

function isComplete(r: WebRecipe): boolean {
  return r.ingredients.length >= 3 && r.instructions.length >= 1
}

export async function findWebRecipes(query: string): Promise<WebRecipe[]> {
  const urls = await searchRecipeUrls(query)
  if (urls.length === 0) return []
  const settled = await Promise.allSettled(urls.slice(0, 8).map(extractRecipe))
  const recipes = settled
    .map(s => s.status === 'fulfilled' ? s.value : null)
    .filter((r): r is WebRecipe => r !== null && isComplete(r))
  return rankRecipes(recipes).slice(0, 3)
}
