export type Retailer = 'orinabiji' | 'agrohub' | 'nikora'

export const RETAILERS: Retailer[] = ['orinabiji', 'agrohub', 'nikora']

export const RETAILER_LABELS: Record<Retailer, string> = {
  orinabiji: '2 Nabiji',
  agrohub: 'Agrohub',
  nikora: 'Nikora',
}

/** What an adapter returns for one product. */
export interface ScrapedProduct {
  retailer: Retailer
  productName: string   // as listed (Georgian)
  price: number         // GEL
  unit?: string         // 'kg' | 'ც' | '500g' etc.
  sourceUrl: string
}

/** One retailer's cheapest match for an ingredient. */
export interface PriceMatch {
  retailer: Retailer
  productName: string
  price: number
  unit?: string
  sourceUrl: string
  scrapedAt: string     // ISO
}

/** An ingredient with its per-retailer matches. */
export interface MatchedIngredient {
  ingredient: string    // original e.g. "2 large eggs"
  term: string          // stripped core e.g. "eggs"
  termGe?: string       // Georgian translation used for lookup
  matches: PriceMatch[] // one cheapest real (scraped) row per retailer that carries it
  approxPrice?: number  // AI estimate (₾) of a typical Georgian supermarket price — shown
                        // (clearly labelled "≈ approx") when no real scraped match exists
}

/** Basket total for one retailer across all matched ingredients. */
export interface Basket {
  retailer: Retailer
  total: number
  missing: string[]     // terms this retailer has no match for
}
