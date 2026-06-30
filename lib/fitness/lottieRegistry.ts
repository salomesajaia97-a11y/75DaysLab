export type ExerciseFocus = 'full' | 'core' | 'upper' | 'lower' | 'cardio' | 'yoga'

export interface LottieAnimation {
  id: string
  name: string
  file: string
  focus: ExerciseFocus[]
  creator: string
  sourceUrl: string
}

export const ANIMATIONS: LottieAnimation[] = [
  {
    id: 'crunches',
    name: 'Crunches',
    file: '/lottie/exercises/crunches.json',
    focus: ['core', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-crunches-14027998',
  },
  {
    id: 'dips',
    name: 'Dips',
    file: '/lottie/exercises/dips.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-dips-14027999',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    file: '/lottie/exercises/dumbbell-curl.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-dumbbell-curl-14027996',
  },
  {
    id: 'inclined-press',
    name: 'Inclined Press',
    file: '/lottie/exercises/inclined-press.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-inclined-press-14028001',
  },
  {
    id: 'barbell-lunges',
    name: 'Barbell Lunges',
    file: '/lottie/exercises/barbell-lunges.json',
    focus: ['lower', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-barbell-lunges-14028004',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    file: '/lottie/exercises/yoga.json',
    focus: ['yoga'],
    creator: 'GFXPRO.TV',
    sourceUrl: 'https://iconscout.com/lottie-animation/girl-doing-yoga-8768461',
  },
  {
    id: 'treadmill',
    name: 'Treadmill Run',
    file: '/lottie/exercises/treadmill.json',
    focus: ['cardio', 'full'],
    creator: 'GFXPRO.TV',
    sourceUrl: 'https://iconscout.com/lottie-animation/girl-running-on-treadmill-8768459',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    file: '/lottie/exercises/cycling.json',
    focus: ['cardio', 'full'],
    creator: 'Rizal Novendra',
    sourceUrl: 'https://iconscout.com/lottie-animation/cycling-15329849',
  },
]

export function getAnimationsForFocus(focus: ExerciseFocus): LottieAnimation[] {
  return ANIMATIONS.filter(a => a.focus.includes(focus))
}

export const ANIMATION_CREDITS = [
  {
    creator: 'Muhammad Noor Ridho',
    pack: 'Man Gym Exercises',
    url: 'https://iconscout.com/contributors/zridxs',
  },
  {
    creator: 'GFXPRO.TV',
    pack: 'Fitness Activities',
    url: 'https://iconscout.com/contributors/gfxpro-tv',
  },
  {
    creator: 'Rizal Novendra',
    pack: 'Cycling',
    url: 'https://iconscout.com/contributors/rizal-novendra',
  },
]
