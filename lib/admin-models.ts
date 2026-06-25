import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'
import { Squad } from '@/models/Squad'
import { Photo } from '@/models/Photo'
import { CycleLog } from '@/models/CycleLog'
import { DailyLog } from '@/models/DailyLog'
import { FoodLog } from '@/models/FoodLog'
import { WaterLog } from '@/models/WaterLog'
import { JournalEntry } from '@/models/JournalEntry'
import { GroceryPrice } from '@/models/GroceryPrice'
import type { Model } from 'mongoose'

export const FULL_ACCESS_MODELS = ['user', 'challenge', 'squad', 'photo'] as const
export const READ_ONLY_MODELS = ['cyclelog', 'dailylog', 'foodlog', 'waterlog', 'journalentry', 'groceryprice'] as const
export type ModelSlug = (typeof FULL_ACCESS_MODELS)[number] | (typeof READ_ONLY_MODELS)[number]

export interface ModelMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>
  label: string
  searchField: string
  readOnly: boolean
}

export const MODEL_REGISTRY: Record<ModelSlug, ModelMeta> = {
  user:         { model: User,         label: 'Users',          searchField: 'email',   readOnly: false },
  challenge:    { model: Challenge,    label: 'Challenges',     searchField: 'userId',  readOnly: false },
  squad:        { model: Squad,        label: 'Squads',         searchField: 'name',    readOnly: false },
  photo:        { model: Photo,        label: 'Photos',         searchField: 'userId',  readOnly: false },
  cyclelog:     { model: CycleLog,     label: 'Cycle Logs',     searchField: 'userId',  readOnly: true  },
  dailylog:     { model: DailyLog,     label: 'Daily Logs',     searchField: 'userId',  readOnly: true  },
  foodlog:      { model: FoodLog,      label: 'Food Logs',      searchField: 'userId',  readOnly: true  },
  waterlog:     { model: WaterLog,     label: 'Water Logs',     searchField: 'userId',  readOnly: true  },
  journalentry:  { model: JournalEntry,  label: 'Journal Entries', searchField: 'userId',      readOnly: true  },
  groceryprice:  { model: GroceryPrice,  label: 'Grocery Prices',  searchField: 'productName', readOnly: true  },
}

export function isValidModelSlug(slug: string): slug is ModelSlug {
  return slug in MODEL_REGISTRY
}
