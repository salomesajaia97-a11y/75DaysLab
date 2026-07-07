// Georgian localization overlay for the fitness data layer.
// The source data in `workoutPlans.ts` / `exerciseLottieRegistry.ts` stays in
// English; this module supplies Georgian equivalents keyed by slug / id / enum,
// plus locale-aware accessors used by the fitness components.
//
// Nothing here mutates the source data — callers localize at render time via
// `useLanguage()` → `locale`, so switching language re-renders in place.

import type { Locale } from '@/lib/i18n'
import type {
  CatalogExercise,
  TrainingPlan,
  PlanGoal,
  Equipment,
  WorkoutLocation,
} from '@/lib/fitness/workoutPlans'
import type { ExerciseLevel, ExerciseFocus } from '@/lib/fitness/exerciseLottieRegistry'

// ── Muscle names ──────────────────────────────────────────────────────────
const MUSCLE_GE: Record<string, string> = {
  Quads: 'კვადრიცეპსი',
  Glutes: 'დუნდულოს კუნთები',
  Hamstrings: 'ბარძაყის უკანა კუნთები',
  Chest: 'გულმკერდი',
  Shoulders: 'მხრები',
  Triceps: 'ტრიცეპსი',
  Core: 'კორი',
  'Lower Back': 'ქვედა ზურგი',
  'Hip Flexors': 'თეძოს მომხრელები',
  Calves: 'წვივები',
  Abs: 'მუცლის პრესი',
  Obliques: 'ირიბი კუნთები',
  'Full Body': 'მთელი სხეული',
  Legs: 'ფეხები',
  'Upper Chest': 'ზედა გულმკერდი',
  'Hip Abductors': 'თეძოს განმზიდველები',
}

// ── Per-exercise prose (keyed by slug) ──────────────────────────────────────
interface ExerciseGe {
  name: string
  instructions: string[]
  safetyTips: string[]
  beginnerModification: string
  advancedOption: string
}

const EXERCISE_GE: Record<string, ExerciseGe> = {
  squat: {
    name: 'ჩაჯდომა',
    instructions: [
      'დადექი ფეხებზე მხრების სიგანეზე, წინდები ოდნავ გარეთ.',
      'გადაწიე მენჯი უკან და მოხარე მუხლები დასაშვებად.',
      'გულმკერდი ზემოთ გეჭიროს, მუხლები წინდების ხაზზე.',
      'ქუსლებზე დაწოლით ისევ წამოდექი.',
    ],
    safetyTips: ['ქუსლები მთელი დროის განმავლობაში იატაკზე გეჭიროს.', 'ჩაჯექი მხოლოდ იმდენად, რამდენადაც მუხლებისთვის კომფორტულია.'],
    beginnerModification: 'დაჯექი სკამზე და წამოდექი — გამოიყენე სიღრმის შესაფასებლად.',
    advancedOption: 'დაიჭირე წყვილი განტელი მხრებთან დამატებითი დატვირთვისთვის.',
  },
  'wall-pushup': {
    name: 'კედლის აზიდვა',
    instructions: [
      'დადექი კედლიდან ხელის სიგრძეზე, ხელები მხრების სიმაღლეზე.',
      'მოხარე იდაყვები და მიიტანე გულმკერდი კედელთან.',
      'დაბრუნდი საწყის მდგომარეობაში, სხეული სწორ ხაზზე შენარჩუნებით.',
    ],
    safetyTips: ['კორი ოდნავ დაჭიმული გეჭიროს.', 'იმოძრავე ნელა და კონტროლით.'],
    beginnerModification: 'დადექი კედელთან ახლოს დატვირთვის შესამცირებლად.',
    advancedOption: 'გადადი მყარ სკამზე დახრილ აზიდვაზე.',
  },
  'glute-bridge': {
    name: 'დუნდულოს ხიდი',
    instructions: [
      'დაწექი ზურგზე, მუხლები მოხრილი, ტერფები იატაკზე თეძოს სიგანეზე.',
      'დაჭიმე დუნდულოები და ასწიე მენჯი ჭერისკენ.',
      'შეჩერდი ზედა წერტილში, შემდეგ კონტროლით ჩამოწიე.',
    ],
    safetyTips: ['ნუ გადაიღუნები ზედმეტად ქვედა ზურგში.', 'მოძრაობა დუნდულოებით წარმართე.'],
    beginnerModification: 'შეამცირე ამპლიტუდა — ასწიე მხოლოდ რამდენიმე სანტიმეტრით.',
    advancedOption: 'გააკეთე ცალფეხა ხიდები, ერთი ფეხი გაშლილი.',
  },
  'bird-dog': {
    name: 'ჩიტი-ძაღლი',
    instructions: [
      'დადექი ოთხზე, მაჯები მხრების ქვეშ, მუხლები თეძოების ქვეშ.',
      'გაშალე მოპირდაპირე ხელი და ფეხი ტანის დონემდე.',
      'დაბრუნდი კონტროლით და შეცვალე მხარე.',
    ],
    safetyTips: ['მენჯი იატაკის პარალელურად გეჭიროს.', 'იმოძრავე ნელა ბალანსის შესანარჩუნებლად.'],
    beginnerModification: 'გაშალე მხოლოდ ფეხი, ორივე ხელი იატაკზე დატოვე.',
    advancedOption: 'დაამატე პაუზა და მცირე კრანჩი გამეორებებს შორის.',
  },
  'march-in-place': {
    name: 'ადგილზე მარში',
    instructions: [
      'დადექი სწორად და იმარშირე ცალ-ცალკე მუხლების აწევით.',
      'ხელები რიტმულად აამოძრავე.',
      'შეინარჩუნე თანაბარი, კომფორტული ტემპი.',
    ],
    safetyTips: ['დაეშვი რბილად ტერფის შუა ნაწილზე.', 'ისუნთქე თანაბრად.'],
    beginnerModification: 'დაწიე მუხლის სიმაღლე და შეანელე ტემპი.',
    advancedOption: 'დაამატე უფრო მაღალი მუხლები და სწრაფი ტემპი.',
  },
  'side-steps': {
    name: 'გვერდითი ნაბიჯები',
    instructions: [
      'დადექი მუხლებით ოდნავ მოხრილი.',
      'გადადგი ერთი ფეხი გვერდზე, შემდეგ მეორე მიიტანე.',
      'შეინარჩუნე დაბალი, სპორტული პოზა გვერდიდან გვერდზე მოძრაობისას.',
    ],
    safetyTips: ['შეინარჩუნე დაძაბულობა დუნდულოებში.', 'იყავი მსუბუქი ფეხებზე.'],
    beginnerModification: 'გადადგი მცირე ნაბიჯები ნელი ტემპით.',
    advancedOption: 'დაამატე წინაღობის რეზინა მუხლების ზემოთ.',
  },
  pushup: {
    name: 'აზიდვა',
    instructions: [
      'დაიწყე პლანკიდან, ხელები მხრებზე ოდნავ განიერად.',
      'ჩაუშვი გულმკერდი იატაკისკენ, იდაყვები ~45°-ზე.',
      'ისევ ამოიწიე, სხეული სწორ ხაზზე შენარჩუნებით.',
    ],
    safetyTips: ['კორი დაჭიმული გეჭიროს — მენჯი არ ჩამოეშვას.', 'შეჩერდი უკმარისობამდე ერთი გამეორებით ადრე.'],
    beginnerModification: 'ჩამოდი მუხლებზე ან გააკეთე დახრილი აზიდვა.',
    advancedOption: 'შეანელე ჩაშვების ფაზა 3-წამიან ათვლამდე.',
  },
  'walking-lunge': {
    name: 'სიარულით გაბიჯება',
    instructions: [
      'გადადგი წინ და ჩაიხარე სანამ ორივე მუხლი ~90°-ს მიაღწევს.',
      'წინა ქუსლზე დაწოლით გადადგი წინ შემდეგ გაბიჯებაში.',
      'ტანი სწორად გეჭიროს მთელი დროის განმავლობაში.',
    ],
    safetyTips: ['წინა მუხლი ტერფის ზემოთ გეჭიროს.', 'საჭიროების შემთხვევაში გამოიყენე კედელი ბალანსისთვის.'],
    beginnerModification: 'გააკეთე ადგილზე გაბიჯებები საყრდენზე დაჭერით.',
    advancedOption: 'დაიჭირე განტელები გვერდებზე.',
  },
  plank: {
    name: 'პლანკი',
    instructions: [
      'დაეყრდენი წინამხრებსა და წინდებს, იდაყვები მხრების ქვეშ.',
      'შეინარჩუნე სწორი ხაზი თავიდან ქუსლებამდე.',
      'დაჭიმე კორი და გააჩერე, თანაბრად სუნთქვით.',
    ],
    safetyTips: ['მენჯი არ ჩამოეშვას და არ აიწიოს.', 'შეჩერდი, როცა ფორმა ირღვევა.'],
    beginnerModification: 'გააჩერე მუხლებზე დაყრდნობით, წინდების ნაცვლად.',
    advancedOption: 'დაამატე ნელი მხრის შეხებები გაჩერებისას.',
  },
  'step-up': {
    name: 'საფეხურზე ასვლა',
    instructions: [
      'დადექი მყარი საფეხურის ან სკამის წინ.',
      'ავიდა ბოლომდე ერთი ფეხით, ზემოთ სწორად დგომით.',
      'ჩამოდი კონტროლით და შეცვალე წამყვანი ფეხი.',
    ],
    safetyTips: ['გამოიყენე მდგრადი ზედაპირი უსაფრთხო სიმაღლეზე.', 'დააწექი მთელ ტერფს.'],
    beginnerModification: 'გამოიყენე უფრო დაბალი საფეხური.',
    advancedOption: 'დაიჭირე განტელები ან დაამატე მუხლის აწევა ზემოთ.',
  },
  'mountain-climbers': {
    name: 'მთის მცოცავი',
    instructions: [
      'დაიწყე მაღალი პლანკის პოზიციიდან.',
      'მიიტანე ერთი მუხლი გულმკერდისკენ, შემდეგ სწრაფად შეცვალე.',
      'მენჯი დაბლა და კორი დაჭიმული გეჭიროს.',
    ],
    safetyTips: ['მხრები მაჯების ზემოთ გეჭიროს.', 'აკონტროლე ტემპი სისწრაფის ნაცვლად.'],
    beginnerModification: 'ნელა გადადგი მუხლები ცოცვის ნაცვლად.',
    advancedOption: 'გაზარდე ტემპი ფორმის შენარჩუნებით.',
  },
  'fire-hydrant': {
    name: 'თეძოს გვერდითი აწევა',
    instructions: [
      'დაიწყე ოთხზე ნეიტრალური ხერხემლით.',
      'ასწიე ერთი მუხლი გვერდზე, მოხრილი შენარჩუნებით.',
      'ჩამოწიე კონტროლით და გაიმეორე, შემდეგ შეცვალე მხარე.',
    ],
    safetyTips: ['კორი დაჭიმული გეჭიროს, რომ ტანი უძრავად დარჩეს.', 'იმოძრავე მხოლოდ თეძოში.'],
    beginnerModification: 'შეამცირე აწევის სიმაღლე.',
    advancedOption: 'დაამატე წინაღობის რეზინა მუხლების ზემოთ.',
  },
  burpee: {
    name: 'ბერპი',
    instructions: [
      'დგომიდან ჩაჯექი და დადე ხელები იატაკზე.',
      'გადადგი ან გადახტი უკან პლანკში.',
      'დააბრუნე ფეხები და წამოდექი ან ახტი.',
    ],
    safetyTips: ['დაეშვი რბილად მოხრილი მუხლებით.', 'გაანაწილე ძალა — ხარისხი სისწრაფეზე მნიშვნელოვანია.'],
    beginnerModification: 'გადადგი უკან და წინ ხტომის ნაცვლად, აზიდვის გარეშე.',
    advancedOption: 'დაამატე აზიდვა ქვემოთ და ხტომა ზემოთ.',
  },
  'jump-squat': {
    name: 'ახტომით ჩაჯდომა',
    instructions: [
      'ჩაიხარე ჩაჯდომაში.',
      'ააფეთქე ზემოთ მცირე ხტომით.',
      'დაეშვი რბილად ისევ ჩაჯდომაში.',
    ],
    safetyTips: ['ხტომის დაშვება მოხრილი მუხლებით შეამსუბუქე.', 'გამოტოვე, თუ მუხლებში დისკომფორტი გაქვს.'],
    beginnerModification: 'გააკეთე ჩვეულებრივი ჩაჯდომები ხტომის გარეშე.',
    advancedOption: 'დაამატე პაუზა ქვემოთ ხტომამდე.',
  },
  'pike-pushup': {
    name: 'პაიკ-აზიდვა',
    instructions: [
      'დაიწყე "ქვევით მიმართული ძაღლის" პოზაში, მენჯი მაღლა.',
      'მოხარე იდაყვები და ჩაუშვი თავის ზედა ნაწილი იატაკისკენ.',
      'ისევ ამოიწიე საწყის მდგომარეობამდე.',
    ],
    safetyTips: ['კისერი გაგრძელებული და მოძრაობა კონტროლირებული გეჭიროს.', 'შეჩერდი, თუ მხრები იძაბება.'],
    beginnerModification: 'გააკეთე მხრებზე ორიენტირებული დახრილი აზიდვა.',
    advancedOption: 'ასწიე ფეხები საფეხურზე მეტი დატვირთვისთვის.',
  },
  'high-knees': {
    name: 'მაღალი მუხლები',
    instructions: [
      'ირბინე ადგილზე, მუხლების თეძოს სიმაღლეზე აწევით.',
      'ხელები რიტმულად აამოძრავე.',
      'იყავი მსუბუქი და სწრაფი ტერფის წვერებზე.',
    ],
    safetyTips: ['დაეშვი რბილად.', 'შეინარჩუნე სწორი პოზა.'],
    beginnerModification: 'იმარშირე მაღალი მუხლებით ნელი ტემპით.',
    advancedOption: 'გაზარდე სისწრაფე მთელი ინტერვალისთვის.',
  },
  'jump-lunge': {
    name: 'ახტომით გაბიჯება',
    instructions: [
      'დაიწყე გაბიჯების პოზიციიდან.',
      'ახტი და შეცვალე ფეხები ჰაერში.',
      'დაეშვი რბილად მოპირდაპირე გაბიჯებაში.',
    ],
    safetyTips: ['ყოველი დაშვება რბილი მუხლებით შეამსუბუქე.', 'გამოტოვე, თუ სახსრებში დისკომფორტი გაქვს.'],
    beginnerModification: 'გააკეთე მონაცვლეობითი ადგილზე გაბიჯებები ხტომის გარეშე.',
    advancedOption: 'გაზარდე ტემპი კონტროლირებული დაშვებების შენარჩუნებით.',
  },
  'bicycle-crunch': {
    name: 'ველოსიპედის კრანჩი',
    instructions: [
      'დაწექი ზურგზე, ხელები მსუბუქად თავის უკან.',
      'მიიტანე ერთი მუხლი და მოაბრუნე მოპირდაპირე იდაყვი მისკენ.',
      'მონაცვლეობით შეცვალე მხარეები გლუვი მოძრაობით.',
    ],
    safetyTips: ['ნუ დაექაჩები კისერს.', 'ქვედა ზურგი მსუბუქად მიჭერილი გეჭიროს იატაკზე.'],
    beginnerModification: 'შეანელე ტემპი და შეამცირე ამპლიტუდა.',
    advancedOption: 'შეჩერდი და გააჩერე ყოველ მობრუნებაზე.',
  },
}

// ── Training plans (keyed by id) ─────────────────────────────────────────────
const PLAN_GE: Record<string, { title: string; description: string }> = {
  'full-body-starter': {
    title: '28-დღიანი მთელი სხეულის სტარტი',
    description: 'ნაზი მთელი სხეულის რუტინა თანმიმდევრული მოძრაობის ჩვევის ჩამოსაყალიბებლად შენი ტემპით.',
  },
  'home-weight-management': {
    title: '30-დღიანი წონის მართვა სახლში',
    description: 'თანაბარი დაბალი დატვირთვის ვარჯიშები აქტიური, დაბალანსებული ცხოვრების წესის შესანარჩუნებლად სახლში.',
  },
  'lower-body-tone': {
    title: '30-დღიანი ქვედა ტანის ტონუსი',
    description: 'ფოკუსირებული დუნდულოს, კვადრიცეპსისა და ბარძაყის უკანა კუნთების ვარჯიში ქვედა ტანის ძალისა და ფორმისთვის.',
  },
  'mobility-stretching': {
    title: '21-დღიანი მობილურობა და გაჭიმვა',
    description: 'ყოველდღიური მობილურობისა და გაჭიმვის ვარჯიშები მოქნილობის გასაუმჯობესებლად და სიმყარის შესამსუბუქებლად.',
  },
  'gym-strength-builder': {
    title: '30-დღიანი ძალის განვითარება დარბაზში',
    description: 'პროგრესირებადი წინაღობის ვარჯიშები ზოგადი ძალის ასაშენებლად სავარჯიშო აპარატებით.',
  },
}

// ── Enum labels ──────────────────────────────────────────────────────────────
const DIFFICULTY_GE: Record<ExerciseLevel, string> = {
  beginner: 'დამწყები',
  intermediate: 'საშუალო',
  advanced: 'მოწინავე',
}

const GOAL_GE: Record<PlanGoal, string> = {
  'full-body': 'მთელი სხეულის ფიტნესი',
  'weight-management': 'წონის მართვა',
  strength: 'ძალის განვითარება',
  'lower-tone': 'ქვედა ტანის ტონუსი',
  core: 'კორის ძალა',
  mobility: 'მობილურობა / გაჭიმვა',
  endurance: 'გამძლეობა',
}

const EQUIPMENT_GE: Record<Equipment, string> = {
  none: 'არაფერი',
  dumbbells: 'განტელები',
  'resistance-band': 'წინაღობის რეზინა',
  'gym-machines': 'სავარჯიშო აპარატები',
  'yoga-mat': 'იოგას ხალიჩა',
}

const FOCUS_GE: Record<ExerciseFocus, string> = {
  full: 'მთელი სხეული',
  core: 'კორი',
  upper: 'ზედა ტანი',
  lower: 'ქვედა ტანი',
  cardio: 'კარდიო',
  yoga: 'მობილურობა',
}

// focus-area chips carry two extra ids beyond ExerciseFocus
const FOCUS_AREA_GE: Record<string, string> = {
  full: 'მთელი სხეული',
  core: 'კორი',
  upper: 'ზედა ტანი',
  lower: 'ქვედა ტანი',
  cardio: 'კარდიო',
  stretching: 'გაჭიმვა',
  yoga: 'იოგა',
}

// ── Locale-aware accessors ───────────────────────────────────────────────────

/**
 * Localize the English rep-string qualifiers baked into EXERCISE_META.reps
 * (e.g. "10 / side", "20–40s hold", "45s"). Numbers/ranges stay as-is.
 */
export function localizeReps(reps: string, locale: Locale): string {
  if (locale !== 'ge') return reps
  return reps
    .replace(/\bhold\b/gi, 'შეკავება')
    .replace(/\/\s*side/gi, '/ მხარე')
    .replace(/(\d)\s*s\b/g, '$1წმ')
}

/** Localize a whole catalog exercise (name + prose + muscles + reps) for the locale. */
export function localizeExercise(ex: CatalogExercise, locale: Locale): CatalogExercise {
  if (locale !== 'ge') return ex
  const g = EXERCISE_GE[ex.slug]
  if (!g) return ex
  return {
    ...ex,
    name: g.name,
    reps: localizeReps(ex.reps, locale),
    targetMuscles: ex.targetMuscles.map(m => MUSCLE_GE[m] ?? m),
    instructions: g.instructions,
    safetyTips: g.safetyTips,
    beginnerModification: g.beginnerModification,
    advancedOption: g.advancedOption,
  }
}

export function localizePlan(plan: TrainingPlan, locale: Locale): TrainingPlan {
  if (locale !== 'ge') return plan
  const g = PLAN_GE[plan.id]
  return g ? { ...plan, title: g.title, description: g.description } : plan
}

export const difficultyLabel = (level: ExerciseLevel, locale: Locale, en: string) =>
  locale === 'ge' ? DIFFICULTY_GE[level] ?? en : en

export const goalLabel = (goal: PlanGoal, locale: Locale, en: string) =>
  locale === 'ge' ? GOAL_GE[goal] ?? en : en

export const equipmentLabel = (id: Equipment | string, locale: Locale, en: string) =>
  locale === 'ge' ? EQUIPMENT_GE[id as Equipment] ?? en : en

export const focusLabel = (focus: ExerciseFocus, locale: Locale, en: string) =>
  locale === 'ge' ? FOCUS_GE[focus] ?? en : en

export const focusAreaLabel = (id: string, locale: Locale, en: string) =>
  locale === 'ge' ? FOCUS_AREA_GE[id] ?? en : en

export const locationLabel = (loc: WorkoutLocation, locale: Locale) =>
  locale === 'ge' ? (loc === 'home' ? 'სახლი' : 'დარბაზი') : loc === 'home' ? 'Home' : 'Gym'
