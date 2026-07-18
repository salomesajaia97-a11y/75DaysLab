import type { ExerciseDbMediaRecord, ExerciseDbOverrides } from './exerciseMedia'

/** ExerciseDB records used by the current catalog, keyed by stable exerciseId. */
export const EXERCISE_DB_MEDIA: readonly ExerciseDbMediaRecord[] = [
  { exerciseId: 'I4hDWkc', name: 'push-up', gifUrl: 'https://static.exercisedb.dev/media/I4hDWkc.gif', posterUrl: '/exercise-posters/I4hDWkc.png' },
  { exerciseId: 'IZVHb27', name: 'walking lunge', gifUrl: 'https://static.exercisedb.dev/media/IZVHb27.gif', posterUrl: '/exercise-posters/IZVHb27.png' },
  { exerciseId: 'RJgzwny', name: 'mountain climber', gifUrl: 'https://static.exercisedb.dev/media/RJgzwny.gif', posterUrl: '/exercise-posters/RJgzwny.png' },
  { exerciseId: 'dK9394r', name: 'burpee', gifUrl: 'https://static.exercisedb.dev/media/dK9394r.gif', posterUrl: '/exercise-posters/dK9394r.png' },
  { exerciseId: 'LIlE5Tn', name: 'jump squat', gifUrl: 'https://static.exercisedb.dev/media/LIlE5Tn.gif', posterUrl: '/exercise-posters/LIlE5Tn.png' },
  { exerciseId: '6YUfHPL', name: 'quads', gifUrl: 'https://static.exercisedb.dev/media/6YUfHPL.gif' },
  { exerciseId: 'LEH9jxP', name: 'push-up (wall)', gifUrl: 'https://static.exercisedb.dev/media/LEH9jxP.gif' },
  { exerciseId: 'u0cNiij', name: 'low glute bridge on floor', gifUrl: 'https://static.exercisedb.dev/media/u0cNiij.gif' },
  { exerciseId: 'zfNHMN9', name: 'skater hops', gifUrl: 'https://static.exercisedb.dev/media/zfNHMN9.gif' },
  { exerciseId: 'VBAWRPG', name: 'weighted front plank', gifUrl: 'https://static.exercisedb.dev/media/VBAWRPG.gif' },
  { exerciseId: 'aXtJhlg', name: 'dumbbell step-up', gifUrl: 'https://static.exercisedb.dev/media/aXtJhlg.gif' },
  { exerciseId: 'XPUDTt7', name: 'pike-to-cobra push-up', gifUrl: 'https://static.exercisedb.dev/media/XPUDTt7.gif' },
  { exerciseId: 'ealLwvX', name: 'high knee against wall', gifUrl: 'https://static.exercisedb.dev/media/ealLwvX.gif' },
  { exerciseId: 'PM1PZjg', name: 'lunge with jump', gifUrl: 'https://static.exercisedb.dev/media/PM1PZjg.gif' },
  { exerciseId: '1ZFqTDN', name: 'air bike', gifUrl: 'https://static.exercisedb.dev/media/1ZFqTDN.gif' },
] as const

/**
 * Intentionally missing media — no ExerciseDB clip matches the actual exercise,
 * body position and movement pattern, so these render the icon placeholder
 * rather than a misleading substitute:
 *   - Bird Dog        (quadruped opposite arm/leg raise)
 *   - March in Place  (stationary high-knee march)
 *   - Fire Hydrant    (quadruped hip abduction)
 * Add a record above only if a faithful clip is sourced.
 */

/**
 * Verified matches where the app catalog name differs from the ExerciseDB clip
 * name, so exact normalized matching can't find them. Mapped by ExerciseDB ID.
 * Keys are the lowercased catalog display name (see `getCatalog`).
 * The clip chosen for each is the closest bodyweight-appropriate demonstration.
 */
export const EXERCISE_DB_OVERRIDES: ExerciseDbOverrides = {
  'mountain climbers': 'RJgzwny',
  squat: '6YUfHPL',              // clip: "quads" — plain bodyweight squat
  'wall push-up': 'LEH9jxP',     // clip: "push-up (wall)"
  'glute bridge': 'u0cNiij',     // clip: "low glute bridge on floor"
  'side steps': 'zfNHMN9',       // clip: "skater hops" — closest lateral movement
  plank: 'VBAWRPG',              // clip: "weighted front plank" — same hold
  'step up': 'aXtJhlg',          // clip: "dumbbell step-up" — same pattern
  'pike push-up': 'XPUDTt7',     // clip: "pike-to-cobra push-up"
  'high knees': 'ealLwvX',       // clip: "high knee against wall"
  'jump lunge': 'PM1PZjg',       // clip: "lunge with jump"
  'bicycle crunch': '1ZFqTDN',   // clip: "air bike"
}
