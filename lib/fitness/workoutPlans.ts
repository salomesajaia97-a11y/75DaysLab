// Workout planning data layer for the Fitness page.
// Augments the auto-generated exercise Lottie registry with human-readable
// coaching metadata, and defines recommended training plans + focus areas.
// Safe, non-clickbait wording throughout — no "burn fat fast" claims.

import {
  EXERCISE_LOTTIES,
  findExercise,
  type ExerciseLevel,
  type ExerciseFocus,
  type Gender,
} from '@/lib/fitness/exerciseLottieRegistry'
import type { Gender as ProfileGender } from '@/types'

export type WorkoutLocation = 'home' | 'gym'
export type Equipment = 'none' | 'dumbbells' | 'resistance-band' | 'gym-machines' | 'yoga-mat'
export type PlanGoal =
  | 'full-body'
  | 'weight-management'
  | 'strength'
  | 'lower-tone'
  | 'core'
  | 'mobility'
  | 'endurance'

/** Profile gender may be 'other' — animations only ship male/female, so map it. */
export function resolveGender(g: ProfileGender | undefined | null): Gender {
  return g === 'female' ? 'female' : 'male'
}

// ── Coaching metadata, keyed by exercise slug ─────────────────────────────
// One entry per slug in the registry (gender-agnostic).

export interface ExerciseMeta {
  slug: string
  targetMuscles: string[]
  /** work time per set, in seconds */
  durationSec: number
  sets: number
  /** reps as a string so we can express "30s" holds too */
  reps: string
  restSec: number
  equipment: Equipment
  instructions: string[]
  safetyTips: string[]
  beginnerModification: string
  advancedOption: string
}

export const EXERCISE_META: Record<string, ExerciseMeta> = {
  squat: {
    slug: 'squat',
    targetMuscles: ['Quads', 'Glutes', 'Hamstrings'],
    durationSec: 40, sets: 3, reps: '12–15', restSec: 45, equipment: 'none',
    instructions: [
      'Stand with feet shoulder-width apart, toes slightly out.',
      'Push your hips back and bend your knees to lower down.',
      'Keep your chest up and knees tracking over your toes.',
      'Drive through your heels to stand back up.',
    ],
    safetyTips: ['Keep your heels on the floor throughout.', 'Only go as low as feels comfortable for your knees.'],
    beginnerModification: 'Sit back onto a chair and stand up, using it to gauge depth.',
    advancedOption: 'Hold a pair of dumbbells at your shoulders for extra load.',
  },
  'wall-pushup': {
    slug: 'wall-pushup',
    targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
    durationSec: 40, sets: 3, reps: '10–12', restSec: 40, equipment: 'none',
    instructions: [
      'Stand arm’s length from a wall, hands at shoulder height.',
      'Bend your elbows to bring your chest toward the wall.',
      'Push back to the start, keeping your body in a straight line.',
    ],
    safetyTips: ['Keep your core gently braced.', 'Move slowly and under control.'],
    beginnerModification: 'Stand closer to the wall to reduce the load.',
    advancedOption: 'Progress to an incline push-up on a sturdy bench.',
  },
  'glute-bridge': {
    slug: 'glute-bridge',
    targetMuscles: ['Glutes', 'Hamstrings', 'Core'],
    durationSec: 40, sets: 3, reps: '12–15', restSec: 40, equipment: 'yoga-mat',
    instructions: [
      'Lie on your back, knees bent, feet flat and hip-width apart.',
      'Squeeze your glutes and lift your hips toward the ceiling.',
      'Pause at the top, then lower with control.',
    ],
    safetyTips: ['Avoid over-arching your lower back.', 'Keep the movement driven by your glutes.'],
    beginnerModification: 'Reduce the range — lift only a few inches.',
    advancedOption: 'Do single-leg bridges, one leg extended.',
  },
  'bird-dog': {
    slug: 'bird-dog',
    targetMuscles: ['Core', 'Lower Back', 'Glutes'],
    durationSec: 40, sets: 3, reps: '10 / side', restSec: 35, equipment: 'yoga-mat',
    instructions: [
      'Start on all fours, wrists under shoulders, knees under hips.',
      'Extend your opposite arm and leg until level with your torso.',
      'Return with control and switch sides.',
    ],
    safetyTips: ['Keep your hips square to the floor.', 'Move slowly to keep your balance.'],
    beginnerModification: 'Extend just the leg, keeping both hands down.',
    advancedOption: 'Add a pause and a small crunch between reps.',
  },
  'march-in-place': {
    slug: 'march-in-place',
    targetMuscles: ['Hip Flexors', 'Calves', 'Core'],
    durationSec: 45, sets: 3, reps: '45s', restSec: 30, equipment: 'none',
    instructions: [
      'Stand tall and march by lifting one knee at a time.',
      'Swing your arms naturally in rhythm.',
      'Keep a steady, comfortable pace.',
    ],
    safetyTips: ['Land softly through the mid-foot.', 'Breathe steadily throughout.'],
    beginnerModification: 'Lower the knee height and slow the pace.',
    advancedOption: 'Add higher knees and a quicker tempo.',
  },
  'side-steps': {
    slug: 'side-steps',
    targetMuscles: ['Glutes', 'Quads', 'Calves'],
    durationSec: 45, sets: 3, reps: '45s', restSec: 30, equipment: 'none',
    instructions: [
      'Stand with knees slightly bent.',
      'Step one foot out to the side, then bring the other to meet it.',
      'Keep a low, athletic stance as you move side to side.',
    ],
    safetyTips: ['Keep tension in your glutes.', 'Stay light on your feet.'],
    beginnerModification: 'Take smaller steps at a slower pace.',
    advancedOption: 'Add a resistance band above the knees.',
  },
  pushup: {
    slug: 'pushup',
    targetMuscles: ['Chest', 'Shoulders', 'Triceps', 'Core'],
    durationSec: 40, sets: 3, reps: '8–12', restSec: 45, equipment: 'none',
    instructions: [
      'Start in a plank, hands slightly wider than shoulders.',
      'Lower your chest toward the floor, elbows at ~45°.',
      'Press back up, keeping your body in a straight line.',
    ],
    safetyTips: ['Keep your core braced — no sagging hips.', 'Stop a rep short of failure.'],
    beginnerModification: 'Drop to your knees or push up from an incline.',
    advancedOption: 'Slow the lowering phase to a 3-second count.',
  },
  'walking-lunge': {
    slug: 'walking-lunge',
    targetMuscles: ['Quads', 'Glutes', 'Hamstrings'],
    durationSec: 45, sets: 3, reps: '10 / side', restSec: 45, equipment: 'none',
    instructions: [
      'Step forward and lower until both knees are ~90°.',
      'Drive through the front heel to step forward into the next lunge.',
      'Keep your torso tall throughout.',
    ],
    safetyTips: ['Keep your front knee over your ankle.', 'Use a wall for balance if needed.'],
    beginnerModification: 'Do stationary lunges holding onto support.',
    advancedOption: 'Hold dumbbells at your sides.',
  },
  plank: {
    slug: 'plank',
    targetMuscles: ['Core', 'Shoulders', 'Glutes'],
    durationSec: 30, sets: 3, reps: '20–40s hold', restSec: 40, equipment: 'yoga-mat',
    instructions: [
      'Rest on your forearms and toes, elbows under shoulders.',
      'Keep a straight line from head to heels.',
      'Brace your core and hold, breathing steadily.',
    ],
    safetyTips: ['Don’t let your hips sag or pike up.', 'Stop when your form starts to break.'],
    beginnerModification: 'Hold from your knees instead of your toes.',
    advancedOption: 'Add slow shoulder taps while holding.',
  },
  'step-up': {
    slug: 'step-up',
    targetMuscles: ['Quads', 'Glutes', 'Calves'],
    durationSec: 45, sets: 3, reps: '10 / side', restSec: 40, equipment: 'none',
    instructions: [
      'Face a sturdy step or bench.',
      'Step up fully with one foot, standing tall at the top.',
      'Step down with control and switch the lead leg.',
    ],
    safetyTips: ['Use a stable surface at a safe height.', 'Drive through the whole foot.'],
    beginnerModification: 'Use a lower step.',
    advancedOption: 'Hold dumbbells or add a knee-drive at the top.',
  },
  'mountain-climbers': {
    slug: 'mountain-climbers',
    targetMuscles: ['Core', 'Shoulders', 'Hip Flexors'],
    durationSec: 30, sets: 3, reps: '30s', restSec: 40, equipment: 'none',
    instructions: [
      'Start in a high plank position.',
      'Drive one knee toward your chest, then switch quickly.',
      'Keep your hips low and core tight.',
    ],
    safetyTips: ['Keep your shoulders over your wrists.', 'Control the pace over speed.'],
    beginnerModification: 'Step the knees in slowly instead of driving.',
    advancedOption: 'Increase tempo while keeping form.',
  },
  'fire-hydrant': {
    slug: 'fire-hydrant',
    targetMuscles: ['Glutes', 'Hip Abductors', 'Core'],
    durationSec: 40, sets: 3, reps: '12 / side', restSec: 35, equipment: 'yoga-mat',
    instructions: [
      'Start on all fours with a neutral spine.',
      'Lift one knee out to the side, keeping it bent.',
      'Lower with control and repeat, then switch sides.',
    ],
    safetyTips: ['Keep your core braced so your torso stays still.', 'Move only through the hip.'],
    beginnerModification: 'Reduce the lift height.',
    advancedOption: 'Add a resistance band above the knees.',
  },
  burpee: {
    slug: 'burpee',
    targetMuscles: ['Full Body', 'Core', 'Legs'],
    durationSec: 30, sets: 3, reps: '8–10', restSec: 50, equipment: 'none',
    instructions: [
      'From standing, squat and place your hands on the floor.',
      'Step or jump back to a plank.',
      'Return your feet in and stand or jump up.',
    ],
    safetyTips: ['Land softly with bent knees.', 'Pace yourself — quality over speed.'],
    beginnerModification: 'Step back and up instead of jumping, no push-up.',
    advancedOption: 'Add a push-up at the bottom and a jump at the top.',
  },
  'jump-squat': {
    slug: 'jump-squat',
    targetMuscles: ['Quads', 'Glutes', 'Calves'],
    durationSec: 30, sets: 3, reps: '10–12', restSec: 50, equipment: 'none',
    instructions: [
      'Lower into a squat.',
      'Explode up into a small jump.',
      'Land softly back into the squat.',
    ],
    safetyTips: ['Absorb the landing with bent knees.', 'Skip if you have knee discomfort.'],
    beginnerModification: 'Do bodyweight squats without the jump.',
    advancedOption: 'Add a pause at the bottom before jumping.',
  },
  'pike-pushup': {
    slug: 'pike-pushup',
    targetMuscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    durationSec: 40, sets: 3, reps: '6–10', restSec: 50, equipment: 'yoga-mat',
    instructions: [
      'Start in a downward-dog position, hips high.',
      'Bend your elbows to lower the top of your head toward the floor.',
      'Press back up to the start.',
    ],
    safetyTips: ['Keep your neck long and movements controlled.', 'Stop if your shoulders strain.'],
    beginnerModification: 'Do a shoulder-focused incline push-up instead.',
    advancedOption: 'Elevate your feet on a step for more load.',
  },
  'high-knees': {
    slug: 'high-knees',
    targetMuscles: ['Hip Flexors', 'Core', 'Calves'],
    durationSec: 30, sets: 3, reps: '30s', restSec: 40, equipment: 'none',
    instructions: [
      'Run in place, driving your knees up to hip height.',
      'Pump your arms in rhythm.',
      'Stay light and quick on the balls of your feet.',
    ],
    safetyTips: ['Land softly.', 'Keep an upright posture.'],
    beginnerModification: 'March with high knees at a slower pace.',
    advancedOption: 'Increase speed for the full interval.',
  },
  'jump-lunge': {
    slug: 'jump-lunge',
    targetMuscles: ['Quads', 'Glutes', 'Calves'],
    durationSec: 30, sets: 3, reps: '8 / side', restSec: 50, equipment: 'none',
    instructions: [
      'Start in a lunge position.',
      'Jump and switch your legs in the air.',
      'Land softly into the opposite lunge.',
    ],
    safetyTips: ['Absorb each landing with soft knees.', 'Skip if you have joint discomfort.'],
    beginnerModification: 'Do alternating stationary lunges without the jump.',
    advancedOption: 'Increase tempo while keeping controlled landings.',
  },
  'bicycle-crunch': {
    slug: 'bicycle-crunch',
    targetMuscles: ['Abs', 'Obliques', 'Core'],
    durationSec: 30, sets: 3, reps: '15 / side', restSec: 35, equipment: 'yoga-mat',
    instructions: [
      'Lie on your back, hands lightly behind your head.',
      'Bring one knee in while rotating the opposite elbow toward it.',
      'Alternate sides in a smooth pedalling motion.',
    ],
    safetyTips: ['Don’t pull on your neck.', 'Keep your lower back gently pressed down.'],
    beginnerModification: 'Slow the tempo and reduce the range.',
    advancedOption: 'Pause and hold at each rotation.',
  },
}

/** Combined view: registry entry (for the Lottie) + coaching metadata. */
export interface CatalogExercise extends ExerciseMeta {
  name: string
  level: ExerciseLevel
  focus: ExerciseFocus[]
  /** true when a Lottie animation ships for this exercise (both genders) */
  lottieAvailable: boolean
}

/** All exercises (one per slug), enriched with metadata, sorted by level. */
export function getCatalog(): CatalogExercise[] {
  const seen = new Set<string>()
  const out: CatalogExercise[] = []
  for (const e of EXERCISE_LOTTIES) {
    if (seen.has(e.slug)) continue
    const meta = EXERCISE_META[e.slug]
    if (!meta) continue
    seen.add(e.slug)
    // registry ships one asset per gender per slug → available for the catalog view
    out.push({ ...meta, name: e.name, level: e.level, focus: e.focus, lottieAvailable: true })
  }
  return out
}

export function getCatalogByLevel(level: ExerciseLevel): CatalogExercise[] {
  return getCatalog().filter(e => e.level === level)
}

/** Estimated minutes to complete one exercise (all sets incl. rest). */
export function exerciseMinutes(e: Pick<ExerciseMeta, 'durationSec' | 'restSec' | 'sets'>): number {
  return Math.max(1, Math.round(((e.durationSec + e.restSec) * e.sets) / 60))
}

/** Lottie file path for a slug + resolved gender (falls back to any match). */
export function lottieFileFor(slug: string, gender: Gender): string | null {
  return (findExercise(slug, gender) ?? findExercise(slug, gender === 'male' ? 'female' : 'male'))?.file ?? null
}

/**
 * Thumbnail Lottie source for a slug + gender, or null when no asset exists
 * (→ callers show the pastel icon fallback). Lives under public/lottie/<gender>/.
 */
export function thumbLottieFor(slug: string, gender: Gender): string | null {
  return lottieFileFor(slug, gender)
}

// ── Focus areas (circular chips) ──────────────────────────────────────────

export interface FocusAreaDef {
  id: ExerciseFocus | 'stretching'
  label: string
  emoji: string
}

export const FOCUS_AREAS: FocusAreaDef[] = [
  { id: 'full', label: 'Full Body', emoji: '🧍' },
  { id: 'core', label: 'Core', emoji: '🎯' },
  { id: 'upper', label: 'Upper Body', emoji: '💪' },
  { id: 'lower', label: 'Lower Body', emoji: '🦵' },
  { id: 'cardio', label: 'Cardio', emoji: '❤️' },
  { id: 'stretching', label: 'Stretching', emoji: '🤸' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘' },
]

// ── Recommended training plans ─────────────────────────────────────────────

export interface TrainingPlan {
  id: string
  title: string
  durationDays: number
  difficulty: ExerciseLevel
  location: WorkoutLocation
  goal: PlanGoal
  description: string
  /** soft pastel gradient for the card banner */
  gradient: string
  accent: string
  emoji: string
}

export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'full-body-starter',
    title: '28-Day Full Body Starter',
    durationDays: 28,
    difficulty: 'beginner',
    location: 'home',
    goal: 'full-body',
    description: 'A gentle full-body routine to build a consistent movement habit at your own pace.',
    gradient: 'linear-gradient(135deg, #d6f5e2 0%, #cdeee6 100%)',
    accent: '#20a06b',
    emoji: '🌱',
  },
  {
    id: 'home-weight-management',
    title: '30-Day Home Weight Management',
    durationDays: 30,
    difficulty: 'beginner',
    location: 'home',
    goal: 'weight-management',
    description: 'Steady low-impact sessions to support an active, balanced lifestyle at home.',
    gradient: 'linear-gradient(135deg, #dbeaff 0%, #cdeee6 100%)',
    accent: '#3b82c4',
    emoji: '⚖️',
  },
  {
    id: 'lower-body-tone',
    title: '30-Day Lower Body Tone',
    durationDays: 30,
    difficulty: 'intermediate',
    location: 'home',
    goal: 'lower-tone',
    description: 'Focused glute, quad and hamstring work to build lower-body strength and shape.',
    gradient: 'linear-gradient(135deg, #f3e2f5 0%, #dbeaff 100%)',
    accent: '#9c4fb0',
    emoji: '🦵',
  },
  {
    id: 'mobility-stretching',
    title: '21-Day Mobility & Stretching',
    durationDays: 21,
    difficulty: 'beginner',
    location: 'home',
    goal: 'mobility',
    description: 'Daily mobility and stretching flows to improve flexibility and ease stiffness.',
    gradient: 'linear-gradient(135deg, #d6f5e2 0%, #e6f5d6 100%)',
    accent: '#5a9c2f',
    emoji: '🤸',
  },
  {
    id: 'gym-strength-builder',
    title: '30-Day Gym Strength Builder',
    durationDays: 30,
    difficulty: 'advanced',
    location: 'gym',
    goal: 'strength',
    description: 'Progressive resistance sessions to build overall strength using gym equipment.',
    gradient: 'linear-gradient(135deg, #ffe8d6 0%, #f3e2f5 100%)',
    accent: '#c4763b',
    emoji: '🏋️',
  },
]

// ── Labels for builder selects ─────────────────────────────────────────────

export const GOAL_OPTIONS: { id: PlanGoal; label: string }[] = [
  { id: 'full-body', label: 'Full body fitness' },
  { id: 'weight-management', label: 'Weight management' },
  { id: 'strength', label: 'Strength building' },
  { id: 'lower-tone', label: 'Lower body tone' },
  { id: 'core', label: 'Core strength' },
  { id: 'mobility', label: 'Mobility / stretching' },
  { id: 'endurance', label: 'Endurance' },
]

export const EQUIPMENT_OPTIONS: { id: Equipment; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'resistance-band', label: 'Resistance band' },
  { id: 'gym-machines', label: 'Gym machines' },
  { id: 'yoga-mat', label: 'Yoga mat' },
]

export const DIFFICULTY_LABEL: Record<ExerciseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const GOAL_LABEL: Record<PlanGoal, string> = Object.fromEntries(
  GOAL_OPTIONS.map(o => [o.id, o.label]),
) as Record<PlanGoal, string>

/** Map a builder goal to the exercise focus we should draw exercises from. */
export function goalToFocus(goal: PlanGoal): ExerciseFocus {
  switch (goal) {
    case 'lower-tone': return 'lower'
    case 'core': return 'core'
    case 'strength': return 'upper'
    case 'mobility': return 'yoga'
    case 'endurance': return 'cardio'
    case 'weight-management': return 'cardio'
    default: return 'full'
  }
}

// ── Plan generation ─────────────────────────────────────────────────────────

export interface BuilderSelection {
  location: WorkoutLocation
  level: ExerciseLevel
  goal: PlanGoal
  minutes: 15 | 30 | 45 | 60
  daysPerWeek: 2 | 3 | 4 | 5
  equipment: Equipment
}

export interface GeneratedPlan {
  selection: BuilderSelection
  /** ordered exercises for a single session */
  exercises: CatalogExercise[]
  estimatedMinutes: number
}

/**
 * Build a single-session exercise list from the builder selection.
 * Picks exercises matching the goal's focus, preferring the chosen level,
 * then scales the count to fit the chosen session length.
 */
export function generatePlan(sel: BuilderSelection): GeneratedPlan {
  const focus = goalToFocus(sel.goal)
  const catalog = getCatalog()

  const matchesFocus = (e: CatalogExercise) => e.focus.includes(focus)
  const primary = catalog.filter(e => matchesFocus(e) && e.level === sel.level)
  const secondary = catalog.filter(e => matchesFocus(e) && e.level !== sel.level)
  const filler = catalog.filter(e => !matchesFocus(e))
  const ordered = [...primary, ...secondary, ...filler]

  // ~5 min per exercise (work + rest + transition); at least 3, at most 8.
  const target = Math.max(3, Math.min(8, Math.round(sel.minutes / 5)))
  const exercises = ordered.slice(0, target)

  const estimatedMinutes = Math.round(
    exercises.reduce((acc, e) => acc + (e.durationSec + e.restSec) * e.sets, 0) / 60,
  )

  return { selection: sel, exercises, estimatedMinutes }
}

// ── Weekly plan generation (wizard) ──────────────────────────────────────────

export const FOCUS_LABEL: Record<ExerciseFocus, string> = {
  full: 'Full Body',
  core: 'Core',
  upper: 'Upper Body',
  lower: 'Lower Body',
  cardio: 'Cardio',
  yoga: 'Mobility',
}

/** Ordered focus rotation per goal — cycled to fill the chosen days/week. */
const GOAL_ROTATION: Record<PlanGoal, ExerciseFocus[]> = {
  'full-body': ['full', 'lower', 'upper', 'core', 'cardio'],
  'weight-management': ['cardio', 'full', 'lower', 'core'],
  strength: ['upper', 'lower', 'full', 'core'],
  'lower-tone': ['lower', 'core', 'full', 'cardio'],
  core: ['core', 'full', 'lower', 'cardio'],
  mobility: ['yoga', 'core', 'full'],
  endurance: ['cardio', 'full', 'lower', 'core'],
}

/** Whether an exercise's required equipment fits what the user has available. */
function equipmentAllowed(exEquip: Equipment, sel: Equipment, location: WorkoutLocation): boolean {
  if (location === 'gym') return true // gym floor covers everything
  if (exEquip === 'none' || exEquip === 'yoga-mat') return true // bodyweight / floor
  return exEquip === sel
}

export interface DayPlan {
  /** 1-based day number within the week */
  index: number
  focus: ExerciseFocus
  label: string
  exercises: CatalogExercise[]
  minutes: number
}

export interface WeeklyPlan {
  selection: BuilderSelection
  days: DayPlan[]
}

/** Pick exercises for one focus, preferring the chosen level + allowed gear. */
function pickForFocus(focus: ExerciseFocus, sel: BuilderSelection, count: number): CatalogExercise[] {
  const catalog = getCatalog().filter(e => equipmentAllowed(e.equipment, sel.equipment, sel.location))
  const inFocus = (e: CatalogExercise) => e.focus.includes(focus)
  const primary = catalog.filter(e => inFocus(e) && e.level === sel.level)
  const secondary = catalog.filter(e => inFocus(e) && e.level !== sel.level)
  const filler = catalog.filter(e => !inFocus(e))

  const ordered: CatalogExercise[] = []
  const seen = new Set<string>()
  for (const e of [...primary, ...secondary, ...filler]) {
    if (seen.has(e.slug)) continue
    seen.add(e.slug)
    ordered.push(e)
    if (ordered.length >= count) break
  }
  return ordered
}

/**
 * Build a personalized weekly plan from the full wizard selection.
 * Rotates focuses by goal across `daysPerWeek`, sizes each day by `minutes`,
 * respects level + equipment + location. Gender only affects which animation
 * asset renders (handled at the component layer), not exercise choice.
 */
export function generateWeeklyPlan(sel: BuilderSelection): WeeklyPlan {
  const rotation = GOAL_ROTATION[sel.goal] ?? GOAL_ROTATION['full-body']
  const perDay = Math.max(3, Math.min(6, Math.round(sel.minutes / 6)))

  const days: DayPlan[] = Array.from({ length: sel.daysPerWeek }, (_, i) => {
    const focus = rotation[i % rotation.length]
    const exercises = pickForFocus(focus, sel, perDay)
    const minutes = exercises.reduce((acc, e) => acc + exerciseMinutes(e), 0)
    return { index: i + 1, focus, label: FOCUS_LABEL[focus], exercises, minutes }
  })

  return { selection: sel, days }
}
