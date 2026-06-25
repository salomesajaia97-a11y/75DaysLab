// lib/grocery/agrohub.ts
import type { ScrapedProduct } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function harvestToken(): Promise<string | null> {
  try {
    const res = await fetch('https://agrohub.ge', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const m = setCookie.match(/agrohub-access_token=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : null
  } catch { return null }
}

interface AhProduct { id?: string | number; name?: string; nameGeo?: string; title?: string; price?: number; salePrice?: number; unit?: string; slug?: string }

function mapProduct(p: AhProduct): ScrapedProduct | null {
  const price = p.salePrice ?? p.price
  const productName = (p.nameGeo ?? p.name ?? p.title ?? '').trim()
  if (!price || !productName) return null
  return {
    retailer: 'agrohub',
    productName,
    price: Number(price),
    unit: p.unit,
    sourceUrl: p.slug ? `https://agrohub.ge/product/${p.slug}` : (p.id ? `https://agrohub.ge/product/${p.id}` : 'https://agrohub.ge'),
  }
}

async function fetchPage(token: string, page: number, query?: string): Promise<ScrapedProduct[]> {
  try {
    const q = query ? `&Search=${encodeURIComponent(query)}` : ''
    const res = await fetch(`https://api.agrohub.ge/v1/Products?Page=${page}&Limit=100${q}`, {
      headers: { 'User-Agent': UA, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const products: AhProduct[] = data?.data ?? data?.items ?? data?.products ?? (Array.isArray(data) ? data : [])
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
