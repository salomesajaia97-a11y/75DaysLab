export interface ClassifyInput {
  title?: string
  category?: string
  tags?: string[]
  ingredients?: string[]
  suitableForDiet?: string | string[]
}

export interface DerivedAttrs {
  ingredientCount?: number
  isOnePot: boolean
  dietTags: string[]
}

const ONE_POT_RE = /one[- ]?(pot|bowl|pan)|sheet[- ]?pan|skillet|dump[- ]?(dinner|meal)?|\bone[- ]?dish\b/i

// schema.org RestrictedDiet IRI/name → our tag ('' = no mapping)
const DIET_IRI_MAP: Record<string, string> = {
  vegandiet: 'vegan',
  vegetariandiet: 'vegetarian',
  glutenfreediet: 'gluten-free',
  diabeticdiet: '',
  lowfatdiet: '',
  lowcaloriediet: '',
  lowsaltdiet: '',
  lowlactosediet: 'dairy-free',
  halaldiet: '',
  kosherdiet: '',
}

// keyword (tested against title+category+tags) → tag
const DIET_KEYWORDS: { re: RegExp; tag: string }[] = [
  { re: /\bvegan\b/i, tag: 'vegan' },
  { re: /\bvegetarian\b|\bveggie\b/i, tag: 'vegetarian' },
  { re: /gluten[- ]?free/i, tag: 'gluten-free' },
  { re: /dairy[- ]?free/i, tag: 'dairy-free' },
  { re: /whole[- ]?food/i, tag: 'whole-food' },
  { re: /plant[- ]?based/i, tag: 'plant-forward' },
]

const VOCAB = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'plant-forward', 'whole-food']

export function classifyRecipe(input: ClassifyInput): DerivedAttrs {
  const tags = input.tags ?? []
  const haystack = [input.title ?? '', input.category ?? '', ...tags].join(' ')

  const ingredientCount = input.ingredients?.length

  const isOnePot = ONE_POT_RE.test(haystack)

  const found = new Set<string>()

  // From schema.org suitableForDiet
  const diets = Array.isArray(input.suitableForDiet)
    ? input.suitableForDiet
    : input.suitableForDiet
    ? [input.suitableForDiet]
    : []
  for (const d of diets) {
    const key = String(d).toLowerCase().replace(/[^a-z]/g, '').replace(/^https?schemaorg/, '')
    const mapped = DIET_IRI_MAP[key]
    if (mapped) found.add(mapped)
  }

  // From keywords
  for (const { re, tag } of DIET_KEYWORDS) {
    if (re.test(haystack)) found.add(tag)
  }

  // Derived: vegan/vegetarian implies plant-forward
  if (found.has('vegan') || found.has('vegetarian')) found.add('plant-forward')

  const dietTags = VOCAB.filter(t => found.has(t))

  return { ingredientCount, isOnePot, dietTags }
}
