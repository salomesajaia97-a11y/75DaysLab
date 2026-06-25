// lib/grocery/orinabiji.ts
//
// 2 Nabiji / Ori Nabiji. orinabiji.ge redirects to the Next.js SPA at 2nabiji.ge,
// whose catalog is served by catalog-api.orinabiji.ge/catalog/api (verified live):
//   GET /catalog/api/warehouses           -> { status, data: [{ _id, geolocation, ... }] }
//   GET /catalog/api/products?warehouseId  -> { status, data: { products: [{ _id, productId, title: { ge }, ... }] } }
//
// IMPORTANT: the catalog API exposes product METADATA only (title.ge, barCode,
// weights, discount) — it carries NO price. Live prices/stock are delivered
// separately via socket-api.orinabiji.ge (realtime websocket), which is out of
// scope for a REST scraper. Per the project's truth principle (never show a
// price we didn't really scrape), mapProduct drops every product that has no
// numeric price, so this adapter currently yields []. Endpoints + Georgian
// title mapping are wired correctly so that if/when a priced REST field appears
// (e.g. product.price / product.stock.price), it starts returning real rows with
// a one-line change. Until then, 2 Nabiji shows "not available" in the UI.

import type { ScrapedProduct } from './types'

const BASE = 'https://catalog-api.orinabiji.ge/catalog/api'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function pinWarehouseId(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/warehouses`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
    const id = list?.[0]?._id ?? list?.[0]?.id
    return id != null ? String(id) : null
  } catch { return null }
}

// Catalog product shape (verified). `price`/`stock.price` are not present today
// but are typed optimistically so a future priced field maps with no churn.
interface OnProduct {
  _id?: string
  title?: { ge?: string; en?: string }
  price?: number
  stock?: { price?: number }
  productNetWeight?: number
}

function mapProduct(p: OnProduct): ScrapedProduct | null {
  const price = p.stock?.price ?? p.price
  const productName = (p.title?.ge ?? p.title?.en ?? '').trim()
  if (!price || !productName) return null   // no real price -> skip (truth principle)
  return {
    retailer: 'orinabiji',
    productName,
    price: Number(price),
    sourceUrl: p._id ? `https://2nabiji.ge/ge/product/${p._id}` : 'https://2nabiji.ge',
  }
}

async function fetchProducts(warehouseId: string, limit: number): Promise<ScrapedProduct[]> {
  try {
    const res = await fetch(`${BASE}/products?warehouseId=${warehouseId}&limit=${limit}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const raw = data?.data?.products ?? data?.data ?? data?.products
    const products: OnProduct[] = Array.isArray(raw) ? raw : []
    return products.map(mapProduct).filter((x): x is ScrapedProduct => x !== null)
  } catch { return [] }
}

export async function scrape(): Promise<ScrapedProduct[]> {
  const wh = await pinWarehouseId()
  if (!wh) { console.error('[orinabiji] no warehouseId'); return [] }
  return fetchProducts(wh, 300)
}

export async function refreshOne(_query: string): Promise<ScrapedProduct[]> {
  // The catalog /products/search endpoint requires an internal `id` param and
  // still returns no price, so a term-based live refresh isn't possible here.
  // Returns [] until a priced endpoint is available. Param kept for interface parity.
  void _query
  return []
}
