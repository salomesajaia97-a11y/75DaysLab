// lib/grocery/orinabiji.ts
import type { ScrapedProduct } from './types'

const BASE = 'https://catalog-api.orinabiji.ge'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function pinWarehouseId(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/warehouses`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data?.data ?? data?.warehouses ?? [])
    const id = list?.[0]?.id ?? list?.[0]?.warehouseId
    return id != null ? String(id) : null
  } catch { return null }
}

interface OnProduct { name?: string; title?: string; slug?: string; stock?: { price?: number }; price?: number; unit?: string }

function mapProduct(p: OnProduct): ScrapedProduct | null {
  const price = p.stock?.price ?? p.price
  const productName = (p.name ?? p.title ?? '').trim()
  if (!price || !productName) return null
  return {
    retailer: 'orinabiji',
    productName,
    price: Number(price),
    unit: p.unit,
    sourceUrl: p.slug ? `https://orinabiji.ge/product/${p.slug}` : 'https://orinabiji.ge',
  }
}

async function searchProducts(warehouseId: string, query: string, limit: number): Promise<ScrapedProduct[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/products/search?lang=ge&warehouseId=${warehouseId}&query=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const products: OnProduct[] = data?.data ?? data?.products ?? (Array.isArray(data) ? data : [])
    return products.map(mapProduct).filter((x): x is ScrapedProduct => x !== null)
  } catch { return [] }
}

// staple food terms to seed the daily scrape (Georgian)
const STAPLES = ['კვერცხი', 'ბრინჯი', 'ქათამი', 'ხახვი', 'პომიდორი', 'კარტოფილი', 'ლობიო', 'რძე', 'ყველი', 'პური', 'ზეთი', 'შაქარი', 'მარილი', 'მაკარონი', 'ხორცი', 'თევზი', 'სტაფილო', 'წიწაკა', 'ნიორი', 'იოგურტი']

export async function scrape(): Promise<ScrapedProduct[]> {
  const wh = await pinWarehouseId()
  if (!wh) { console.error('[orinabiji] no warehouseId'); return [] }
  const out: ScrapedProduct[] = []
  for (const term of STAPLES) {
    out.push(...await searchProducts(wh, term, 15))
    if (out.length >= 300) break
  }
  return out
}

export async function refreshOne(query: string): Promise<ScrapedProduct[]> {
  const wh = await pinWarehouseId()
  if (!wh) return []
  return searchProducts(wh, query, 10)
}
