// Exercise media layer — swappable between real GIFs (current) and the custom
// Lottie rig (previous work, kept on disk). Components read a single opaque
// `ExerciseMedia` descriptor, so switching the whole app back to Lottie later
// is a one-line change here (`MEDIA_MODE`) with zero UI edits.
//
// GIFs are the original clips from the ExerciseDB cache the project already
// holds; we reference them by their public CDN URL (no bundling, no storage).
// Matches below were verified against that cache — see docs/exercise-gif-report.md.

import { findExercise, EXERCISE_LOTTIES, type Gender } from '@/lib/fitness/exerciseLottieRegistry'

/** Active media source for the whole app. Flip to 'lottie' to restore the rig. */
export type ExerciseMediaMode = 'gif' | 'lottie'
export const MEDIA_MODE: ExerciseMediaMode = 'gif'

/** How confident the GIF↔exercise match is. Drives the review report. */
export type GifMatchStatus = 'matched' | 'needs-review' | 'missing'

export interface ExerciseGif {
  slug: string
  /** ExerciseDB clip id (source of truth for the remote GIF) */
  exerciseId: string | null
  /** name of the source clip in the ExerciseDB cache */
  sourceName: string
  /** remote GIF url, or null when no clip matched this exercise */
  gifUrl: string | null
  status: GifMatchStatus
  /** why a human should look, when status !== 'matched' */
  note?: string
}

const CDN = 'https://static.exercisedb.dev/media'
const gif = (id: string) => `${CDN}/${id}.gif`

// slug → matched ExerciseDB clip. Keyed by the registry slug so it lines up
// 1:1 with the 20 curated exercises. Verified matches carry a real gifUrl;
// `missing` entries have none and transparently fall back to the Lottie asset.
export const EXERCISE_GIFS: Record<string, ExerciseGif> = {
  // ── Beginner ──────────────────────────────────────────────
  squat: {
    slug: 'squat', exerciseId: '6YUfHPL', sourceName: 'quads (bodyweight squat)',
    gifUrl: gif('6YUfHPL'), status: 'matched',
    note: 'Source clip labelled "quads" in the cache — motion is a plain bodyweight squat.',
  },
  'wall-pushup': {
    slug: 'wall-pushup', exerciseId: 'LEH9jxP', sourceName: 'push-up (wall)',
    gifUrl: gif('LEH9jxP'), status: 'matched',
  },
  'glute-bridge': {
    slug: 'glute-bridge', exerciseId: 'u0cNiij', sourceName: 'low glute bridge on floor',
    gifUrl: gif('u0cNiij'), status: 'matched',
  },
  'bird-dog': {
    slug: 'bird-dog', exerciseId: null, sourceName: '—',
    gifUrl: null, status: 'missing',
    note: 'No bird-dog clip in the ExerciseDB cache — keeps its custom Lottie.',
  },
  'march-in-place': {
    slug: 'march-in-place', exerciseId: null, sourceName: '—',
    gifUrl: null, status: 'missing',
    note: 'No march-in-place clip in the cache — keeps its custom Lottie.',
  },
  'side-steps': {
    slug: 'side-steps', exerciseId: 'zfNHMN9', sourceName: 'skater hops',
    gifUrl: gif('zfNHMN9'), status: 'needs-review',
    note: 'Closest lateral-movement clip is skater hops (hops, not steps). Confirm suitability.',
  },

  // ── Intermediate ──────────────────────────────────────────
  pushup: {
    slug: 'pushup', exerciseId: 'I4hDWkc', sourceName: 'push-up',
    gifUrl: gif('I4hDWkc'), status: 'matched',
  },
  'walking-lunge': {
    slug: 'walking-lunge', exerciseId: 'IZVHb27', sourceName: 'walking lunge',
    gifUrl: gif('IZVHb27'), status: 'matched',
  },
  plank: {
    slug: 'plank', exerciseId: 'VBAWRPG', sourceName: 'weighted front plank',
    gifUrl: gif('VBAWRPG'), status: 'needs-review',
    note: 'Only front-plank clip in the cache is the weighted variant; bodyweight plank shows the same hold.',
  },
  'step-up': {
    slug: 'step-up', exerciseId: 'aXtJhlg', sourceName: 'dumbbell step-up',
    gifUrl: gif('aXtJhlg'), status: 'needs-review',
    note: 'No bodyweight step-up in the cache; dumbbell variant shows the same movement pattern.',
  },
  'mountain-climbers': {
    slug: 'mountain-climbers', exerciseId: 'RJgzwny', sourceName: 'mountain climber',
    gifUrl: gif('RJgzwny'), status: 'matched',
  },
  'fire-hydrant': {
    slug: 'fire-hydrant', exerciseId: null, sourceName: '—',
    gifUrl: null, status: 'missing',
    note: 'No fire-hydrant clip in the cache — keeps its custom Lottie.',
  },

  // ── Advanced ──────────────────────────────────────────────
  burpee: {
    slug: 'burpee', exerciseId: 'dK9394r', sourceName: 'burpee',
    gifUrl: gif('dK9394r'), status: 'matched',
  },
  'jump-squat': {
    slug: 'jump-squat', exerciseId: 'LIlE5Tn', sourceName: 'jump squat',
    gifUrl: gif('LIlE5Tn'), status: 'matched',
  },
  'pike-pushup': {
    slug: 'pike-pushup', exerciseId: 'XPUDTt7', sourceName: 'pike-to-cobra push-up',
    gifUrl: gif('XPUDTt7'), status: 'needs-review',
    note: 'No plain pike push-up in the cache; pike-to-cobra covers the pike phase plus a cobra.',
  },
  'high-knees': {
    slug: 'high-knees', exerciseId: 'ealLwvX', sourceName: 'high knee against wall',
    gifUrl: gif('ealLwvX'), status: 'matched',
    note: 'Wall-supported high-knees variant — same drive pattern.',
  },
  'jump-lunge': {
    slug: 'jump-lunge', exerciseId: 'PM1PZjg', sourceName: 'lunge with jump',
    gifUrl: gif('PM1PZjg'), status: 'matched',
  },
  'bicycle-crunch': {
    slug: 'bicycle-crunch', exerciseId: '1ZFqTDN', sourceName: 'air bike (bicycle crunch)',
    gifUrl: gif('1ZFqTDN'), status: 'matched',
  },
}

// ── Resolved media descriptor consumed by components ─────────────────────────

export type ExerciseMediaKind = 'gif' | 'lottie' | 'none'

export interface ExerciseMedia {
  kind: ExerciseMediaKind
  /** GIF url or Lottie json path, depending on `kind`. null when kind === 'none'. */
  src: string | null
  /** match confidence for GIFs; 'lottie-only' when we fell back to the rig. */
  status: GifMatchStatus | 'lottie-only'
  sourceName?: string
  note?: string
}

/** Lottie json path for a slug, falling back to the other gender's asset. */
function lottiePathFor(slug: string, gender: Gender): string | null {
  return (findExercise(slug, gender) ?? findExercise(slug, gender === 'male' ? 'female' : 'male'))?.file ?? null
}

/**
 * Resolve the media a component should render for an exercise.
 *
 * MEDIA_MODE === 'gif': prefer the matched GIF; if none matched, fall back to
 * the Lottie rig so nothing ever renders empty.
 * MEDIA_MODE === 'lottie': always return the Lottie asset (GIFs ignored) — this
 * is the single switch that restores the previous animation work.
 */
export function getExerciseMedia(slug: string, gender: Gender): ExerciseMedia {
  const lottie = lottiePathFor(slug, gender)

  if (MEDIA_MODE === 'lottie') {
    return lottie
      ? { kind: 'lottie', src: lottie, status: 'lottie-only' }
      : { kind: 'none', src: null, status: 'missing' }
  }

  const g = EXERCISE_GIFS[slug]
  if (g?.gifUrl) {
    return { kind: 'gif', src: g.gifUrl, status: g.status, sourceName: g.sourceName, note: g.note }
  }
  if (lottie) {
    return { kind: 'lottie', src: lottie, status: 'lottie-only', note: g?.note }
  }
  return { kind: 'none', src: null, status: g?.status ?? 'missing', note: g?.note }
}

// ── Review report data ───────────────────────────────────────────────────────

export interface GifReportRow {
  slug: string
  name: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: GifMatchStatus
  sourceName: string
  note?: string
}

/** One row per curated exercise for the GIF review report / any admin UI. */
export function getGifReport(): GifReportRow[] {
  const seen = new Set<string>()
  const rows: GifReportRow[] = []
  for (const e of EXERCISE_LOTTIES) {
    if (seen.has(e.slug)) continue
    seen.add(e.slug)
    const g = EXERCISE_GIFS[e.slug]
    rows.push({
      slug: e.slug,
      name: e.name,
      difficulty: e.level,
      status: g?.status ?? 'missing',
      sourceName: g?.sourceName ?? '—',
      note: g?.note,
    })
  }
  return rows
}
