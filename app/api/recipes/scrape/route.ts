import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { scrapeRecipePage, getRecipeUrlsSkinnyTaste, delay } from '@/lib/scrapers'

// Extend timeout for scraping (requires Pro on Vercel; works locally)
export const maxDuration = 300

const ST_SITEMAPS = [
  'https://www.skinnytaste.com/post-sitemap3.xml',
  'https://www.skinnytaste.com/post-sitemap.xml',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  // batch: how many new recipes to scrape this call (default 8 to stay within timeout)
  const batchSize: number = Math.min(parseInt(body.batch ?? '8'), 20)

  await connectDB()

  const results = { saved: 0, skipped: 0, errors: 0 }

  // Collect candidate URLs from sitemaps
  const perSitemap = Math.ceil(batchSize * 2)
  const candidateUrls: string[] = []
  for (const sm of ST_SITEMAPS) {
    const urls = await getRecipeUrlsSkinnyTaste(sm, perSitemap)
    candidateUrls.push(...urls)
  }

  // Deduplicate
  const seen = new Set<string>()
  const uniqueUrls = candidateUrls.filter(u => { if (seen.has(u)) return false; seen.add(u); return true })

  for (const url of uniqueUrls) {
    if (results.saved + results.skipped + results.errors >= uniqueUrls.length) break
    if (results.saved >= batchSize) break

    const existing = await Recipe.findOne({ sourceUrl: url })
    if (existing) { results.skipped++; continue }

    const scraped = await scrapeRecipePage(url, 'skinnytaste')
    await delay(400)

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
