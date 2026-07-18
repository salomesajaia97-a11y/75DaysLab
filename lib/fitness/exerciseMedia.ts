export interface ExerciseMediaSources {
  lottieUrl?: string
  mp4Url?: string
  gifUrl?: string
  posterUrl?: string
}

export type SelectedExerciseMedia =
  | { type: 'lottie' | 'mp4' | 'gif' | 'poster'; url: string }
  | { type: 'placeholder' }

export interface ExerciseDbMediaRecord {
  exerciseId: string
  name: string
  gifUrl: string
  posterUrl?: string
}

export type ExerciseDbOverrides = Readonly<Record<string, string>>

export function normalizeExerciseName(name: string): string {
  return name.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '')
}

export function selectExerciseMedia(sources: ExerciseMediaSources): SelectedExerciseMedia {
  if (sources.lottieUrl) return { type: 'lottie', url: sources.lottieUrl }
  if (sources.mp4Url) return { type: 'mp4', url: sources.mp4Url }
  if (sources.gifUrl) return { type: 'gif', url: sources.gifUrl }
  if (sources.posterUrl) return { type: 'poster', url: sources.posterUrl }
  return { type: 'placeholder' }
}

export function inferExerciseDbMedia(
  exerciseName: string,
  records: readonly ExerciseDbMediaRecord[],
  overrides: ExerciseDbOverrides = {},
): { exerciseId: string; gifUrl: string; posterUrl?: string } | null {
  const normalizedName = normalizeExerciseName(exerciseName)
  const overrideId = overrides[exerciseName.toLocaleLowerCase('en')]
  const match = overrideId
    ? records.find(record => record.exerciseId === overrideId)
    : records.find(record => normalizeExerciseName(record.name) === normalizedName)

  return match
    ? {
        exerciseId: match.exerciseId,
        gifUrl: match.gifUrl,
        ...(match.posterUrl ? { posterUrl: match.posterUrl } : {}),
      }
    : null
}
