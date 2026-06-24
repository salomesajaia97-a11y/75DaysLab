import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { classifyRecipe } from '@/lib/classify'
import {
  scrapeRecipePage,
  getRecipeUrlsSkinnyTaste,
  getRecipeUrlsAllRecipes,
  getRecipeUrlsMinimalistBaker,
  getRecipeUrlsLoveAndLemons,
  getRecipeUrlsEatingWell,
  getRecipeUrlsSeriousEats,
  getRecipeUrlsSpruceEats,
  delay,
} from '@/lib/scrapers'

// Extend timeout for scraping (requires Pro on Vercel; works locally)
export const maxDuration = 300

const ST_SITEMAPS = [
  'https://www.skinnytaste.com/post-sitemap.xml',
  'https://www.skinnytaste.com/post-sitemap2.xml',
  'https://www.skinnytaste.com/post-sitemap3.xml',
  'https://www.skinnytaste.com/post-sitemap4.xml',
  'https://www.skinnytaste.com/post-sitemap5.xml',
]

type ScrapeTarget = 'skinnytaste' | 'allrecipes' | 'minimalistbaker' | 'loveandlemons' | 'eatingwell' | 'seriouseats' | 'spruceeats'

async function collectUrls(site: ScrapeTarget, limit: number): Promise<string[]> {
  if (site === 'allrecipes')      return getRecipeUrlsAllRecipes(limit)
  if (site === 'minimalistbaker') return getRecipeUrlsMinimalistBaker(limit)
  if (site === 'loveandlemons')   return getRecipeUrlsLoveAndLemons(limit)
  if (site === 'eatingwell')      return getRecipeUrlsEatingWell(limit)
  if (site === 'seriouseats')     return getRecipeUrlsSeriousEats(limit)
  if (site === 'spruceeats')      return getRecipeUrlsSpruceEats(limit)
  // skinnytaste — pull from all 5 sitemaps
  const perSitemap = Math.ceil(limit / ST_SITEMAPS.length) + 10
  const all: string[] = []
  for (const sm of ST_SITEMAPS) {
    const urls = await getRecipeUrlsSkinnyTaste(sm, perSitemap)
    all.push(...urls)
  }
  return all
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const batchSize: number = Math.min(parseInt(body.batch ?? '50'), 200)
  const rawSite = body.site ?? 'skinnytaste'
  const validSites: ScrapeTarget[] = ['skinnytaste', 'allrecipes', 'minimalistbaker', 'loveandlemons', 'eatingwell', 'seriouseats', 'spruceeats']
  const site: ScrapeTarget = validSites.includes(rawSite) ? rawSite : 'skinnytaste'

  await connectDB()

  const results = { saved: 0, skipped: 0, errors: 0, site }

  const candidateUrls = await collectUrls(site, batchSize * 3)

  // Deduplicate
  const seen = new Set<string>()
  const uniqueUrls = candidateUrls.filter(u => { if (seen.has(u)) return false; seen.add(u); return true })

  for (const url of uniqueUrls) {
    if (results.saved >= batchSize) break

    const existing = await Recipe.findOne({ sourceUrl: url })
    if (existing) { results.skipped++; continue }

    const scraped = await scrapeRecipePage(url, site)
    await delay(500)

    if (!scraped) { results.errors++; continue }

    try {
      const derived = classifyRecipe(scraped)
      await Recipe.create({ ...scraped, ...derived, scrapedAt: new Date() })
      results.saved++
    } catch {
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
