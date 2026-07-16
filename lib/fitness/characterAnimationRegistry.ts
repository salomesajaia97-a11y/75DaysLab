import bicycleCrunch from '@/public/fitness-character/exercises/bicycle-crunch.json'
import birdDog from '@/public/fitness-character/exercises/bird-dog.json'
import burpee from '@/public/fitness-character/exercises/burpee.json'
import fireHydrant from '@/public/fitness-character/exercises/fire-hydrant.json'
import gluteBridge from '@/public/fitness-character/exercises/glute-bridge.json'
import highKnees from '@/public/fitness-character/exercises/high-knees.json'
import jumpLunge from '@/public/fitness-character/exercises/jump-lunge.json'
import jumpSquat from '@/public/fitness-character/exercises/jump-squat.json'
import marchInPlace from '@/public/fitness-character/exercises/march-in-place.json'
import mountainClimbers from '@/public/fitness-character/exercises/mountain-climbers.json'
import pikePushup from '@/public/fitness-character/exercises/pike-pushup.json'
import plank from '@/public/fitness-character/exercises/plank.json'
import pushup from '@/public/fitness-character/exercises/pushup.json'
import sideSteps from '@/public/fitness-character/exercises/side-steps.json'
import squat from '@/public/fitness-character/exercises/squat.json'
import stepUp from '@/public/fitness-character/exercises/step-up.json'
import walkingLunge from '@/public/fitness-character/exercises/walking-lunge.json'
import wallPushup from '@/public/fitness-character/exercises/wall-pushup.json'

export type CharacterFrame = {
  time: number
  pelvis: { x: number; y: number }
  rotation: Record<string, number>
}

export type CharacterPivot = { part: string; pivotX: number; pivotY: number }
export type CharacterAssembly = { part: string; parent: string; joint_xy: [number, number] }
export type CharacterAsset = { part: string; svg: string }

export type CharacterAnimationBundle = {
  exercise: { slug: string }
  template: { duration: number; keyframes: CharacterFrame[] }
  rig: {
    pivots: CharacterPivot[] | { parts: CharacterPivot[] }
    assembly: CharacterAssembly[] | { parts: CharacterAssembly[] }
    artParts: CharacterAsset[]
  }
}

const CHARACTER_ANIMATION_BUNDLES: Record<string, CharacterAnimationBundle> = {
  'bicycle-crunch': bicycleCrunch as unknown as CharacterAnimationBundle,
  'bird-dog': birdDog as unknown as CharacterAnimationBundle,
  burpee: burpee as unknown as CharacterAnimationBundle,
  'fire-hydrant': fireHydrant as unknown as CharacterAnimationBundle,
  'glute-bridge': gluteBridge as unknown as CharacterAnimationBundle,
  'high-knees': highKnees as unknown as CharacterAnimationBundle,
  'jump-lunge': jumpLunge as unknown as CharacterAnimationBundle,
  'jump-squat': jumpSquat as unknown as CharacterAnimationBundle,
  'march-in-place': marchInPlace as unknown as CharacterAnimationBundle,
  'mountain-climbers': mountainClimbers as unknown as CharacterAnimationBundle,
  'pike-pushup': pikePushup as unknown as CharacterAnimationBundle,
  plank: plank as unknown as CharacterAnimationBundle,
  pushup: pushup as unknown as CharacterAnimationBundle,
  'side-steps': sideSteps as unknown as CharacterAnimationBundle,
  squat: squat as unknown as CharacterAnimationBundle,
  'step-up': stepUp as unknown as CharacterAnimationBundle,
  'walking-lunge': walkingLunge as unknown as CharacterAnimationBundle,
  'wall-pushup': wallPushup as unknown as CharacterAnimationBundle,
}

export function getCharacterAnimation(slug: string) {
  return CHARACTER_ANIMATION_BUNDLES[slug] ?? null
}
