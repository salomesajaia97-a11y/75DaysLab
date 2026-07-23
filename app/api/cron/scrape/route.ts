import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Recipe } from '@/models/Recipe'
import { scrapeRecipePage, getRecipeUrlsSkinnyTaste, delay } from '@/lib/scrapers'
import { scrapeAllRetailers } from '@/lib/grocery'
import { verifyBearerSecret } from '@/lib/security'

export const maxDuration = 300

const ST_SITEMAPS = [
  'https://www.skinnytaste.com/post-sitemap.xml',
  'https://www.skinnytaste.com/post-sitemap2.xml',
  'https://www.skinnytaste.com/post-sitemap3.xml',
]

export async function GET(req: Request) {
  if (!verifyBearerSecret(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const results = { saved: 0, skipped: 0, errors: 0 }

  const candidateUrls: string[] = []
  for (const sm of ST_SITEMAPS) {
    const urls = await getRecipeUrlsSkinnyTaste(sm, 200)
    candidateUrls.push(...urls)
  }

  const seen = new Set<string>()
  const uniqueUrls = candidateUrls.filter(u => {
    if (seen.has(u)) return false
    seen.add(u)
    return true
  })

  for (const url of uniqueUrls) {
    if (results.saved >= 100) break
    const existing = await Recipe.findOne({ sourceUrl: url })
    if (existing) { results.skipped++; continue }
    const scraped = await scrapeRecipePage(url, 'skinnytaste')
    await delay(500)
    if (!scraped) { results.errors++; continue }
    try {
      await Recipe.create({ ...scraped, scrapedAt: new Date() })
      results.saved++
    } catch {
      results.errors++
    }
  }

  let grocery: { retailer: string; count: number }[] = []
  try {
    grocery = await scrapeAllRetailers()
  } catch (err) {
    console.error('[cron] grocery scrape failed', err instanceof Error ? err.message : String(err))
  }

  return NextResponse.json({ ok: true, ...results, grocery })
}
