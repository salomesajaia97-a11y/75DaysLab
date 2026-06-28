// Georgian cities used by the Outdoor Workout weather card.
// `hasParks` gates the Tbilisi-only park recommendations block.

export interface GeorgianCity {
  /** Stable key + value sent to the weather API. */
  id: string
  /** English display name. */
  name: string
  /** Georgian display name. */
  nameGe: string
  lat: number
  lon: number
  /** Only Tbilisi surfaces the curated parks block. */
  hasParks: boolean
}

export const GEORGIAN_CITIES: GeorgianCity[] = [
  { id: 'Tbilisi', name: 'Tbilisi', nameGe: 'თბილისი', lat: 41.7151, lon: 44.8271, hasParks: true },
  { id: 'Batumi', name: 'Batumi', nameGe: 'ბათუმი', lat: 41.6168, lon: 41.6367, hasParks: false },
  { id: 'Kutaisi', name: 'Kutaisi', nameGe: 'ქუთაისი', lat: 42.2679, lon: 42.6946, hasParks: false },
  { id: 'Rustavi', name: 'Rustavi', nameGe: 'რუსთავი', lat: 41.5495, lon: 45.0028, hasParks: false },
  { id: 'Zugdidi', name: 'Zugdidi', nameGe: 'ზუგდიდი', lat: 42.5088, lon: 41.8709, hasParks: false },
  { id: 'Gori', name: 'Gori', nameGe: 'გორი', lat: 41.9847, lon: 44.1086, hasParks: false },
  { id: 'Telavi', name: 'Telavi', nameGe: 'თელავი', lat: 41.9197, lon: 45.4733, hasParks: false },
  { id: 'Poti', name: 'Poti', nameGe: 'ფოთი', lat: 42.1462, lon: 41.6711, hasParks: false },
]

export const DEFAULT_CITY_ID = 'Tbilisi'

export function findCity(id: string): GeorgianCity | undefined {
  return GEORGIAN_CITIES.find(c => c.id === id)
}
