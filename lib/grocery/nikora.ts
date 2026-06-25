// lib/grocery/nikora.ts
//
// LIVE FINDING (verified): nikorasupermarket.ge is a corporate/news site, not a
// price catalog. Its `product_box_content` blocks are news/promo articles, and
// the "current promotions" page has no parseable per-product price grid (promos
// are image/PDF based). No structured product+price HTML exists to scrape, so
// this adapter yields [] and Nikora shows "not available" in the UI — by design
// (truth principle: never invent a price). Selectors below are kept as a
// best-effort parser in case a structured catalog page is added later.
import * as cheerio from 'cheerio'
import type { ScrapedProduct } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const ROOT = 'https://nikorasupermarket.ge'

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

/** Parse split lari/tetri spans into a number. Nikora renders e.g. <span>3</span><span>.49</span>. */
function parsePrice(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? undefined : n
}

function parsePage(html: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const out: ScrapedProduct[] = []
  $('.product, .product-card, [class*="product-item"]').each((_, el) => {
    const $el = $(el)
    const productName = $el.find('.product-title, .title, [class*="name"]').first().text().trim()
    const price = parsePrice($el.find('.price, [class*="price"]').first().text())
    const href = $el.find('a').first().attr('href')
    if (!productName || !price) return
    out.push({
      retailer: 'nikora',
      productName,
      price,
      sourceUrl: href ? (href.startsWith('http') ? href : `${ROOT}${href}`) : ROOT,
    })
  })
  return out
}

const CATALOG_PAGES = [
  `${ROOT}/category/rdzis-produqtebi`,
  `${ROOT}/category/khorci-tevzi`,
  `${ROOT}/category/baqaleya`,
  `${ROOT}/category/khili-bostneuli`,
]

export async function scrape(): Promise<ScrapedProduct[]> {
  const out: ScrapedProduct[] = []
  for (const url of CATALOG_PAGES) {
    const html = await fetchHtml(url)
    if (!html) continue
    out.push(...parsePage(html))
    if (out.length >= 300) break
  }
  if (out.length === 0) console.error('[nikora] no products parsed — selectors may have changed')
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const html = await fetchHtml(`${ROOT}/search?q=${encodeURIComponent(query)}`)
  if (!html) return []
  return parsePage(html)
}
