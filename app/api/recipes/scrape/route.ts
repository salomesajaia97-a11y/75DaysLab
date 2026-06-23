import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { scrapeRecipePage, getRecipeUrlsSkinnyTaste, getRecipeUrlsAllRecipes, delay } from '@/lib/scrapers'

// Extend timeout for scraping (requires Pro on Vercel; works locally)
export const maxDuration = 300

const ST_SITEMAPS = [
  'https://www.skinnytaste.com/post-sitemap3.xml',
  'https://www.skinnytaste.com/post-sitemap.xml',
]

type ScrapeTarget = 'skinnytaste' | 'allrecipes'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const batchSize: number = Math.min(parseInt(body.batch ?? '8'), 20)
  const site: ScrapeTarget = body.site === 'allrecipes' ? 'allrecipes' : 'skinnytaste'

  await connectDB()

  const results = { saved: 0, skipped: 0, errors: 0, site }

  // Collect candidate URLs
  const perSitemap = Math.ceil(batchSize * 2)
  const candidateUrls: string[] = []

  if (site === 'allrecipes') {
    const urls = await getRecipeUrlsAllRecipes(batchSize * 2)
    candidateUrls.push(...urls)
  } else {
    for (const sm of ST_SITEMAPS) {
      const urls = await getRecipeUrlsSkinnyTaste(sm, perSitemap)
      candidateUrls.push(...urls)
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
      await Recipe.create({ ...scraped, scrapedAt: new Date() })
      results.saved++
    } catch {
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
