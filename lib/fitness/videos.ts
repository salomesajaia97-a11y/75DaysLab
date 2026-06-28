// Curated 45-min routine pointers from certified channels, by focus + location.
// These are honest YouTube search links (same approach as workoutVideos.ts),
// not scraped embeds — the user lands on real results from trusted creators.

import type { IndoorFocus } from './wger'

export type TrainLocation = 'home' | 'gym'

export interface FitnessVideo {
  title: string
  channel: string
  emoji: string
  url: string
}

function yt(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

const FOCUS_TERMS: Record<IndoorFocus, string> = {
  full: 'full body',
  core: 'core abs',
  upper: 'upper body',
  lower: 'lower body legs',
  cardio: 'cardio HIIT',
  yoga: 'yoga flow',
}

// Trusted channels per location — strength/equipment for gym, bodyweight for home.
const HOME_CHANNELS = ['Sydney Cummings Houdyshell', 'Yoga With Adriene', 'The Body Coach TV']
const GYM_CHANNELS = ['Jeff Nippard', 'ATHLEAN-X', 'Renaissance Periodization']

export function getVideos(focus: IndoorFocus, location: TrainLocation): FitnessVideo[] {
  const term = FOCUS_TERMS[focus]
  const channels = location === 'home' ? HOME_CHANNELS : GYM_CHANNELS
  const place = location === 'home' ? 'home no equipment' : 'gym'
  const emojis = location === 'home' ? ['🏠', '🧘', '🔥'] : ['🏋️', '💪', '⚙️']

  return channels.map((channel, i) => ({
    title: `45-Min ${location === 'home' ? 'Home' : 'Gym'} ${capitalize(term)}`,
    channel,
    emoji: emojis[i],
    url: yt(`45 minute ${term} workout ${place} ${channel}`),
  }))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
