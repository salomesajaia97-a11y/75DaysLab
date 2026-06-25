// lib/grocery/index.ts
import { GroceryPrice } from '@/models/GroceryPrice'
import * as orinabiji from './orinabiji'
import * as agrohub from './agrohub'
import * as nikora from './nikora'
import type { Retailer, ScrapedProduct } from './types'

const ADAPTERS: Record<Retailer, { scrape: () => Promise<ScrapedProduct[]>; refreshOne: (q: string) => Promise<ScrapedProduct[]> }> = {
  orinabiji, agrohub, nikora,
}

export const REFRESH_ADAPTERS = ADAPTERS

async function upsert(products: ScrapedProduct[]): Promise<void> {
  for (const p of products) {
    await GroceryPrice.updateOne(
      { retailer: p.retailer, sourceUrl: p.sourceUrl },
      { $set: {
        productName: p.productName,
        searchText: p.productName.toLowerCase().trim(),
        price: p.price,
        unit: p.unit,
        scrapedAt: new Date(),
      } },
      { upsert: true },
    )
  }
}

export async function scrapeAllRetailers(): Promise<{ retailer: Retailer; count: number }[]> {
  const entries = Object.entries(ADAPTERS) as [Retailer, typeof orinabiji][]
  const settled = await Promise.allSettled(entries.map(async ([retailer, adapter]) => {
    const products = await adapter.scrape()
    await upsert(products)
    return { retailer, count: products.length }
  }))
  return settled.map((s, i) => s.status === 'fulfilled' ? s.value : { retailer: entries[i][0], count: 0 })
}
