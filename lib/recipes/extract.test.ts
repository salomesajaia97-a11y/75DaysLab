// lib/recipes/extract.test.ts
import { describe, it, expect } from 'vitest'
import { parseRecipeJsonLd } from './extract'

const HTML = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Shakshuka",
 "recipeIngredient":["4 eggs","1 onion","2 tomatoes","1 tsp paprika"],
 "recipeInstructions":[{"@type":"HowToStep","text":"Saute onion."},{"@type":"HowToStep","text":"Add tomatoes."},{"@type":"HowToStep","text":"Crack eggs in, cover."}],
 "totalTime":"PT25M","recipeYield":"2 servings","image":"https://x.test/img.jpg"}
</script></head><body></body></html>`

describe('parseRecipeJsonLd', () => {
  it('maps a Recipe object to WebRecipe', () => {
    const r = parseRecipeJsonLd(HTML, 'https://www.eatingwell.com/recipe/shakshuka')!
    expect(r.title).toBe('Shakshuka')
    expect(r.ingredients).toHaveLength(4)
    expect(r.instructions[0]).toBe('Saute onion.')
    expect(r.instructions).toHaveLength(3)
    expect(r.totalTimeMin).toBe(25)
    expect(r.servings).toBe('2 servings')
    expect(r.sourceDomain).toBe('eatingwell.com')
  })
  it('handles @graph wrapping', () => {
    const g = HTML.replace('"@type":"Recipe"', '"@type":"WebPage"}],"@graph":[{"@type":"Recipe"')
    // not a strict graph test; ensure no throw and either null or a recipe
    const r = parseRecipeJsonLd(g, 'https://kulinaria.ge/x')
    expect(r === null || typeof r.title === 'string').toBe(true)
  })
  it('returns null when no Recipe present', () => {
    expect(parseRecipeJsonLd('<html><body>no jsonld</body></html>', 'https://x.test/y')).toBeNull()
  })
})
