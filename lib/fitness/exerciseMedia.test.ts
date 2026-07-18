import { describe, expect, it } from 'vitest'
import {
  inferExerciseDbMedia,
  selectExerciseMedia,
  type ExerciseDbMediaRecord,
  type ExerciseMediaSources,
} from './exerciseMedia'

describe('selectExerciseMedia', () => {
  it('uses the production priority Lottie > MP4 > GIF', () => {
    const sources: ExerciseMediaSources = {
      lottieUrl: '/exercise.json',
      mp4Url: '/exercise.mp4',
      gifUrl: '/exercise.gif',
      posterUrl: '/exercise.webp',
    }

    expect(selectExerciseMedia(sources)).toEqual({
      type: 'lottie',
      url: '/exercise.json',
    })
    expect(selectExerciseMedia({ ...sources, lottieUrl: undefined })).toEqual({
      type: 'mp4',
      url: '/exercise.mp4',
    })
    expect(
      selectExerciseMedia({
        ...sources,
        lottieUrl: undefined,
        mp4Url: undefined,
      }),
    ).toEqual({ type: 'gif', url: '/exercise.gif' })
  })

  it('falls back to a poster, then to the static placeholder', () => {
    expect(selectExerciseMedia({ posterUrl: '/poster.webp' })).toEqual({
      type: 'poster',
      url: '/poster.webp',
    })
    expect(selectExerciseMedia({})).toEqual({ type: 'placeholder' })
  })
})

describe('inferExerciseDbMedia', () => {
  const records: ExerciseDbMediaRecord[] = [
    {
      exerciseId: 'push123',
      name: 'push-up',
      gifUrl: 'https://cdn.example/push123.gif',
    },
    {
      exerciseId: 'lunge456',
      name: 'walking lunge',
      gifUrl: 'https://cdn.example/lunge456.gif',
    },
  ]

  it('infers records by normalized exercise name and preserves exerciseId', () => {
    expect(inferExerciseDbMedia('Push up', records)).toEqual({
      exerciseId: 'push123',
      gifUrl: 'https://cdn.example/push123.gif',
    })
  })

  it('does not guess when no exact normalized match exists', () => {
    expect(inferExerciseDbMedia('Wall Push-up', records)).toBeNull()
  })

  it('supports exceptional mappings by ExerciseDB exerciseId', () => {
    expect(
      inferExerciseDbMedia('Forward Lunge', records, {
        'forward lunge': 'lunge456',
      }),
    ).toEqual({
      exerciseId: 'lunge456',
      gifUrl: 'https://cdn.example/lunge456.gif',
    })
  })
})
