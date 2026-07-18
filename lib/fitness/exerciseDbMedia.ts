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
  // Approximate matches (no exact clip exists) — same target/intent, different
  // body position. Flagged needs-review.
  { exerciseId: 'iny3m5y', name: 'dead bug', gifUrl: 'https://static.exercisedb.dev/media/iny3m5y.gif' },
  { exerciseId: 'J9zIWig', name: 'walking high knees lunge', gifUrl: 'https://static.exercisedb.dev/media/J9zIWig.gif' },
  { exerciseId: '7WaDzyL', name: 'side hip abduction', gifUrl: 'https://static.exercisedb.dev/media/7WaDzyL.gif' },
  // Additional bodyweight exercises added to the library.
  { exerciseId: 'X6C6i5Y', name: 'triceps dip', gifUrl: 'https://static.exercisedb.dev/media/X6C6i5Y.gif' },
  { exerciseId: 'soIB2rj', name: 'diamond push-up', gifUrl: 'https://static.exercisedb.dev/media/soIB2rj.gif' },
  { exerciseId: 'TFqbd8t', name: 'crunch floor', gifUrl: 'https://static.exercisedb.dev/media/TFqbd8t.gif' },
  { exerciseId: 'XVDdcoj', name: 'russian twist', gifUrl: 'https://static.exercisedb.dev/media/XVDdcoj.gif' },
  { exerciseId: 'bJYHBIN', name: 'bodyweight standing calf raise', gifUrl: 'https://static.exercisedb.dev/media/bJYHBIN.gif' },
  { exerciseId: 'UVo2Qs2', name: 'flutter kicks', gifUrl: 'https://static.exercisedb.dev/media/UVo2Qs2.gif' },
] as const

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
  // Approximate (needs-review) — closest available, different body position:
  'bird dog': 'iny3m5y',         // clip: "dead bug" (supine, same anti-rotation intent)
  'march in place': 'J9zIWig',   // clip: "walking high knees lunge"
  'fire hydrant': '7WaDzyL',     // clip: "side hip abduction" (side-lying glute med)
  // Added library exercises whose catalog name differs from the clip name:
  crunch: 'TFqbd8t',             // clip: "crunch floor"
  'standing calf raise': 'bJYHBIN',
}
