import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { classifyRecipe } from '@/lib/classify'
import { scrapeRecipePage, getRecipeUrlsSkinnyTaste, getRecipeUrlsAllRecipes, getRecipeUrlsMinimalistBaker, getRecipeUrlsLoveAndLemons, delay } from '@/lib/scrapers'

// Extend timeout for scraping (requires Pro on Vercel; works locally)
export const maxDuration = 300

const ST_SITEMAPS = [
  'https://www.skinnytaste.com/post-sitemap3.xml',
  'https://www.skinnytaste.com/post-sitemap.xml',
]

type ScrapeTarget = 'skinnytaste' | 'allrecipes' | 'minimalistbaker' | 'loveandlemons'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const batchSize: number = Math.min(parseInt(body.batch ?? '8'), 20)
  const allowed: ScrapeTarget[] = ['skinnytaste', 'allrecipes', 'minimalistbaker', 'loveandlemons']
  const site: ScrapeTarget = allowed.includes(body.site) ? body.site : 'skinnytaste'

  await connectDB()

  const results = { saved: 0, skipped: 0, errors: 0, site }

  // Collect candidate URLs
  const perSitemap = Math.ceil(batchSize * 2)
  const candidateUrls: string[] = []

  if (site === 'allrecipes') {
    candidateUrls.push(...await getRecipeUrlsAllRecipes(batchSize * 2))
  } else if (site === 'minimalistbaker') {
    candidateUrls.push(...await getRecipeUrlsMinimalistBaker(batchSize * 2))
  } else if (site === 'loveandlemons') {
    candidateUrls.push(...await getRecipeUrlsLoveAndLemons(batchSize * 2))
  } else {
    for (const sm of ST_SITEMAPS) {
      candidateUrls.push(...await getRecipeUrlsSkinnyTaste(sm, perSitemap))
    }
  }

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
