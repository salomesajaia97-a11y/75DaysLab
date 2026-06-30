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
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    file: '/lottie/exercises/seated-cable-row.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-seated-cable-row-workout-14027997',
  },
  {
    id: 'dumbbell-curls-2',
    name: 'Dumbbell Curls',
    file: '/lottie/exercises/dumbbell-curls-2.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-dumbell-curls-14028000',
  },
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    file: '/lottie/exercises/barbell-curl.json',
    focus: ['upper', 'full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-doing-barbell-curl-14028002',
  },
  {
    id: 'flexing',
    name: 'Flexing',
    file: '/lottie/exercises/flexing.json',
    focus: ['full'],
    creator: 'Muhammad Noor Ridho',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-showing-muscles-14028003',
  },
  {
    id: 'olympic-athlete',
    name: 'Olympic Athlete',
    file: '/lottie/exercises/olympic-athlete.json',
    focus: ['cardio', 'full'],
    creator: 'Shiue Nee',
    sourceUrl: 'https://iconscout.com/lottie-animation/olympic-athlete-4057603',
  },
  {
    id: 'barbell-lift',
    name: 'Barbell Lift',
    file: '/lottie/exercises/barbell-lift.json',
    focus: ['upper', 'full'],
    creator: 'GFXPRO.TV',
    sourceUrl: 'https://iconscout.com/lottie-animation/man-lifting-barbell-8768460',
  },
  {
    id: 'boxing',
    name: 'Boxing',
    file: '/lottie/exercises/boxing.json',
    focus: ['cardio', 'full'],
    creator: 'GFXPRO.TV',
    sourceUrl: 'https://iconscout.com/lottie-animation/male-boxer-8768458',
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
  {
    creator: 'Shiue Nee',
    pack: 'Olympic Athlete',
    url: 'https://iconscout.com/contributors/shiue-nee',
  },
]
