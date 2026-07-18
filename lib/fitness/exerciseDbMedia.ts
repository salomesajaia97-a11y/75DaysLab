import type { ExerciseDbMediaRecord, ExerciseDbOverrides } from './exerciseMedia'

/** ExerciseDB records used by the current catalog, keyed by stable exerciseId. */
export const EXERCISE_DB_MEDIA: readonly ExerciseDbMediaRecord[] = [
  { exerciseId: 'I4hDWkc', name: 'push-up', gifUrl: 'https://static.exercisedb.dev/media/I4hDWkc.gif', posterUrl: '/exercise-posters/I4hDWkc.png' },
  { exerciseId: 'IZVHb27', name: 'walking lunge', gifUrl: 'https://static.exercisedb.dev/media/IZVHb27.gif', posterUrl: '/exercise-posters/IZVHb27.png' },
  { exerciseId: 'RJgzwny', name: 'mountain climber', gifUrl: 'https://static.exercisedb.dev/media/RJgzwny.gif', posterUrl: '/exercise-posters/RJgzwny.png' },
  { exerciseId: 'dK9394r', name: 'burpee', gifUrl: 'https://static.exercisedb.dev/media/dK9394r.gif', posterUrl: '/exercise-posters/dK9394r.png' },
  { exerciseId: 'LIlE5Tn', name: 'jump squat', gifUrl: 'https://static.exercisedb.dev/media/LIlE5Tn.gif', posterUrl: '/exercise-posters/LIlE5Tn.png' },
] as const

/**
 * ExerciseDB uses singular "mountain climber" while the app catalog uses
 * plural "Mountain Climbers". Exact normalized matching intentionally does not
 * singularize names, so this one verified mismatch is mapped by ExerciseDB ID.
 */
export const EXERCISE_DB_OVERRIDES: ExerciseDbOverrides = {
  'mountain climbers': 'RJgzwny',
}
