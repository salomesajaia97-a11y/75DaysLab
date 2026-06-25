// lib/grocery/agrohub.ts
import type { ScrapedProduct } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// The agrohub.ge homepage sets an `agrohub-access_token` cookie whose value is
// URL-encoded JSON: {"token":"<jwt>","isUserToken":false}. The product API wants
// the inner JWT as a Bearer token — NOT the whole JSON blob.
async function harvestToken(): Promise<string | null> {
  try {
    const res = await fetch('https://agrohub.ge', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const m = setCookie.match(/agrohub-access_token=([^;]+)/)
    if (!m) return null
    const raw = decodeURIComponent(m[1])
    try {
      const obj = JSON.parse(raw) as { token?: string }
      return obj.token ?? null
    } catch {
      return raw // fall back to raw value if it is ever a bare token
    }
  } catch { return null }
}

// Live shape (verified): api.agrohub.ge/v1/Products → { products: [{ id, name, price, imageUrl, onSale, previousPrice, ... }] }.
// Product names are English/transliterated, not Georgian. There is no `unit` or `slug`.
interface AhProduct { id?: string | number; name?: string; price?: number; onSale?: boolean; previousPrice?: number | null }

function mapProduct(p: AhProduct): ScrapedProduct | null {
  const price = p.onSale && p.price ? p.price : p.price
  const productName = (p.name ?? '').trim()
  if (!price || !productName) return null
  return {
    retailer: 'agrohub',
    productName,
    price: Number(price),
    sourceUrl: p.id != null ? `https://agrohub.ge/en/product/${p.id}` : 'https://agrohub.ge',
  }
}

async function fetchPage(token: string, page: number, query?: string): Promise<ScrapedProduct[]> {
  try {
    // `Name` is the search param that actually filters (Search/Query/Text are ignored).
    const q = query ? `&Name=${encodeURIComponent(query)}` : ''
    const res = await fetch(`https://api.agrohub.ge/v1/Products?Page=${page}&Limit=100${q}`, {
      headers: { 'User-Agent': UA, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const raw = data?.products ?? data?.data ?? data?.items
    const products: AhProduct[] = Array.isArray(raw) ? raw : []
    return products.map(mapProduct).filter((x): x is ScrapedProduct => x !== null)
  } catch { return [] }
}

export async function scrape(): Promise<ScrapedProduct[]> {
  const token = await harvestToken()
  if (!token) { console.error('[agrohub] no token'); return [] }
  const out: ScrapedProduct[] = []
  for (let page = 1; page <= 3; page++) {
    const rows = await fetchPage(token, page)
    if (rows.length === 0) break
    out.push(...rows)
    if (out.length >= 300) break
  }
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const token = await harvestToken()
  if (!token) return []
  return fetchPage(token, 1, query)
}

// Live matching helpers (used by the matcher so prices show without waiting for
// the daily cron). Harvest the token once, then search many terms with it.
export { harvestToken }
export async function searchByName(token: string, term: string): Promise<ScrapedProduct[]> {
  return fetchPage(token, 1, term)
}
