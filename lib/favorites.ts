export interface FavoriteFood {
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  count: number
  lastLoggedAt: string
}

export interface FavoriteSourceLog {
  description: string
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  loggedAt?: string | Date
}

function ts(v: string | Date | undefined): string {
  if (!v) return new Date(0).toISOString()
  return (v instanceof Date ? v : new Date(v)).toISOString()
}

export function aggregateFavorites(logs: FavoriteSourceLog[], limit = 20): FavoriteFood[] {
  const groups = new Map<string, FavoriteFood>()

  for (const log of logs) {
    const desc = (log.description ?? '').trim()
    if (!desc) continue
    const key = desc.toLowerCase()
    const at = ts(log.loggedAt)
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        description: desc,
        calories: log.calories ?? 0,
        proteinG: log.proteinG ?? 0,
        carbsG: log.carbsG ?? 0,
        fatG: log.fatG ?? 0,
        count: 1,
        lastLoggedAt: at,
      })
      continue
    }

    existing.count += 1
    if (at >= existing.lastLoggedAt) {
      // newest row wins for the displayed name + macros
      existing.description = desc
      existing.calories = log.calories ?? 0
      existing.proteinG = log.proteinG ?? 0
      existing.carbsG = log.carbsG ?? 0
      existing.fatG = log.fatG ?? 0
      existing.lastLoggedAt = at
    }
  }

  return [...groups.values()]
    .sort((a, b) => (b.count - a.count) || b.lastLoggedAt.localeCompare(a.lastLoggedAt))
    .slice(0, limit)
}
