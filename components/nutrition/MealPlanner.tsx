'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock } from 'lucide-react'
import { MEAL_ORDER, MEAL_TIME_RANGES, type MealType } from '@/lib/nutrition-meal'
import { useLanguage } from '@/lib/i18n'
import type { FoodEntry } from '@/types'

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍲',
  snack: '🧁',
}

const MACRO_ACCENT = { protein: '#c07c5e', carbs: '#c5a55a', fat: '#7a9e7e' }

interface MealPlannerProps {
  foodLog: FoodEntry[]
  interactive: boolean
  onAddMeal: (meal: MealType) => void
}

export function MealPlanner({ foodLog, interactive, onAddMeal }: MealPlannerProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {MEAL_ORDER.map(meal => {
        const group = foodLog.filter(e => e.meal === meal)
        const kcal = group.reduce((sum, e) => sum + (e.calories ?? 0), 0)
        const range = MEAL_TIME_RANGES[meal] ?? t('nutrition.snack_allday')
        return (
          <div
            key={meal}
            className="rounded-2xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{MEAL_EMOJI[meal]}</span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
                  >
                    {t(`nutrition.meal_${meal}`)}
                  </p>
                  <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <Clock className="h-3 w-3" /> {range}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {kcal > 0 && (
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    {kcal} kcal
                  </span>
                )}
                {interactive && (
                  <button
                    type="button"
                    onClick={() => onAddMeal(meal)}
                    aria-label={`Add to ${meal}`}
                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {group.length === 0 ? (
              <p className="text-center text-xs py-2" style={{ color: 'var(--muted-foreground)' }}>
                {t('nutrition.slot_empty')}
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {group.map(entry => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between rounded-xl px-3 py-2"
                      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center min-w-0 mr-3">
                        {entry.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.photoUrl} alt="" className="w-8 h-8 rounded-lg object-cover mr-2.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            <span style={{ color: MACRO_ACCENT.protein }}>P {entry.proteinG}g</span>
                            {' · '}
                            <span style={{ color: MACRO_ACCENT.carbs }}>C {entry.carbsG}g</span>
                            {' · '}
                            <span style={{ color: MACRO_ACCENT.fat }}>F {entry.fatG}g</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                          {entry.calories}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>kcal</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
