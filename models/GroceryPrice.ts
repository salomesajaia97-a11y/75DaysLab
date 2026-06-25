import mongoose, { Schema, Document } from 'mongoose'
import type { Retailer } from '@/lib/grocery/types'

export interface IGroceryPrice extends Document {
  retailer: Retailer
  productName: string
  productNameEn?: string
  searchText: string     // normalized lowercase Georgian for matching
  price: number
  unit?: string
  sourceUrl: string
  scrapedAt: Date
}

const GroceryPriceSchema = new Schema<IGroceryPrice>({
  retailer: { type: String, enum: ['orinabiji', 'agrohub', 'nikora'], required: true },
  productName: { type: String, required: true },
  productNameEn: String,
  searchText: { type: String, required: true },
  price: { type: Number, required: true },
  unit: String,
  sourceUrl: { type: String, required: true },
  scrapedAt: { type: Date, default: Date.now },
})

GroceryPriceSchema.index({ retailer: 1, searchText: 1 })
GroceryPriceSchema.index({ scrapedAt: 1 })
GroceryPriceSchema.index({ retailer: 1, sourceUrl: 1 }, { unique: true })

export const GroceryPrice =
  mongoose.models.GroceryPrice ?? mongoose.model<IGroceryPrice>('GroceryPrice', GroceryPriceSchema)
