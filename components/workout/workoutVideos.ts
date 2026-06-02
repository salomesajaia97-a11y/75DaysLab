export interface WorkoutVideo {
  title: string
  channel: string
  emoji: string
  url: string
}

export const INDOOR_VIDEOS: WorkoutVideo[] = [
  {
    title: '45-Min Full Body HIIT',
    channel: 'Sydney Cummings Houdyshell',
    emoji: '🔥',
    url: 'https://www.youtube.com/results?search_query=45+minute+full+body+HIIT+Sydney+Cummings',
  },
  {
    title: '45-Min Yoga Flow',
    channel: 'Yoga With Adriene',
    emoji: '🧘',
    url: 'https://www.youtube.com/results?search_query=45+minute+yoga+flow+Adriene',
  },
  {
    title: '45-Min Strength No Equipment',
    channel: 'MuscleWatchers',
    emoji: '💪',
    url: 'https://www.youtube.com/results?search_query=45+minute+strength+training+no+equipment',
  },
]

export const OUTDOOR_VIDEOS: WorkoutVideo[] = [
  {
    title: '45-Min Outdoor HIIT Cardio',
    channel: 'The Body Coach TV',
    emoji: '🏃',
    url: 'https://www.youtube.com/results?search_query=45+minute+outdoor+HIIT+cardio',
  },
  {
    title: '45-Min Walk/Run Intervals',
    channel: "Runner's World",
    emoji: '🌿',
    url: 'https://www.youtube.com/results?search_query=45+minute+walk+run+intervals+outdoor',
  },
  {
    title: '45-Min Outdoor Full Body Stretch',
    channel: 'Bob & Brad',
    emoji: '🌤️',
    url: 'https://www.youtube.com/results?search_query=45+minute+outdoor+full+body+stretching',
  },
]
