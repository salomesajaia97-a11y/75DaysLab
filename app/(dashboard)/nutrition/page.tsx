'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MacroDashboard } from '@/components/nutrition/MacroDashboard'
import { FoodLogger } from '@/components/nutrition/FoodLogger'
import { getProfile, saveProfile } from '@/lib/storage'
import { calculateMacros } from '@/lib/calculations'
import { useLanguage } from '@/lib/i18n'
import type { FoodEntry, MacroTargets, UserProfile } from '@/types'

const FALLBACK_TARGETS: MacroTargets = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 }

const MACRO_ACCENT: Record<string, string> = {
  protein: '#c07c5e',
  carbs: '#c5a55a',
  fat: '#7a9e7e',
}

export default function NutritionPage() {
  const { t } = useLanguage()
  const [targets, setTargets] = useState<MacroTargets>(() => {
    const p = getProfile()
    return p ? calculateMacros(p.age, p.gender, p.heightCm, p.weightKg, p.goal) : FALLBACK_TARGETS
  })
  const [consumed, setConsumed] = useState<MacroTargets>({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])

  useEffect(() => {
    function applyProfile(profile: UserProfile) {
      setTargets(calculateMacros(profile.age, profile.gender, profile.heightCm, profile.weightKg, profile.goal))
    }

    const cached = getProfile()
    if (cached) {
      applyProfile(cached)
    } else {
      fetch('/api/users/me')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            saveProfile(data)
            applyProfile(data)
          }
        })
        .catch(() => {})
    }
  }, [])

  function handleLogged(entry: FoodEntry) {
    setFoodLog(prev => [entry, ...prev])
    setConsumed(prev => ({
      calories: prev.calories + entry.calories,
      proteinG: prev.proteinG + entry.proteinG,
      carbsG: prev.carbsG + entry.carbsG,
      fatG: prev.fatG + entry.fatG,
    }))
  }

  return (
    <div className="max-w-lg mx-auto px-1 py-2 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <h1
          className="text-4xl font-bold tracking-tight leading-none"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
        >
          {t('nutrition.title')}
        </h1>
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.today')}
        </span>
      </div>

      {/* Daily Macros */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.daily_macros')}
        </p>
        <MacroDashboard targets={targets} consumed={consumed} />
      </section>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Log a Meal */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.log_meal')}
        </p>
        <FoodLogger onLogged={handleLogged} />
      </section>

      {/* Food Log */}
      <AnimatePresence>
        {foodLog.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="h-px mb-6" style={{ background: 'var(--border)' }} />
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
              {t('nutrition.todays_log')}
            </p>

            <div className="space-y-2">
              <AnimatePresence>
                {foodLog.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i === 0 ? 0 : 0 }}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="min-w-0 mr-4">
                      <p className="text-sm font-medium truncate">{entry.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        <span style={{ color: MACRO_ACCENT.protein }}>P {entry.proteinG}g</span>
                        {' · '}
                        <span style={{ color: MACRO_ACCENT.carbs }}>C {entry.carbsG}g</span>
                        {' · '}
                        <span style={{ color: MACRO_ACCENT.fat }}>F {entry.fatG}g</span>
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
                      >
                        {entry.calories}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>kcal</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
