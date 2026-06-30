'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MacroDashboard } from '@/components/nutrition/MacroDashboard'
import { AddFoodSheet } from '@/components/nutrition/AddFoodSheet'
import { WeeklyChart } from '@/components/nutrition/WeeklyChart'
import { MealPlanner } from '@/components/nutrition/MealPlanner'
import { RecipeBrowser } from '@/components/recipes/RecipeBrowser'
import { ScrollReveal, Aurora } from '@/components/shared/Motion'
import { getProfile, saveProfile } from '@/lib/storage'
import { calculateMacros } from '@/lib/calculations'
import { useLanguage } from '@/lib/i18n'
import { type MealType } from '@/lib/nutrition-meal'
import type { FoodEntry, MacroTargets, UserProfile } from '@/types'

const FALLBACK_TARGETS: MacroTargets = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 }

const TODAY = new Date().toISOString().split('T')[0]

export default function NutritionPage() {
  const { t } = useLanguage()
  const [targets, setTargets] = useState<MacroTargets>(() => {
    const p = getProfile()
    return p ? calculateMacros(p.age, p.gender, p.heightCm, p.weightKg, p.goal) : FALLBACK_TARGETS
  })
  const [consumed, setConsumed] = useState<MacroTargets>({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [week, setWeek] = useState<{ date: string; calories: number }[]>([])
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null)

  function handleAddMeal(m: MealType) {
    setSheetMeal(m)
  }

  const isToday = selectedDate === TODAY

  const loadDay = useCallback((date: string) => {
    fetch(`/api/nutrition?date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const entries: FoodEntry[] = (data.logs ?? []).map((l: {
          _id: string; description: string; calories: number
          proteinG: number; carbsG: number; fatG: number; loggedAt?: string
          meal?: MealType; photoUrl?: string
        }) => ({
          id: l._id,
          description: l.description,
          calories: l.calories,
          proteinG: l.proteinG,
          carbsG: l.carbsG,
          fatG: l.fatG,
          loggedAt: l.loggedAt ?? new Date().toISOString(),
          meal: l.meal ?? 'snack',
          photoUrl: l.photoUrl,
        }))
        setFoodLog(entries)
        setConsumed(data.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
      })
      .catch(() => {})
  }, [])

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

    fetch('/api/nutrition/week')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.days) setWeek(data.days)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadDay(selectedDate)
  }, [selectedDate, loadDay])

  function handleLogged(entry: FoodEntry) {
    if (selectedDate !== TODAY) return
    setFoodLog(prev => [entry, ...prev])
    setConsumed(prev => ({
      calories: prev.calories + (entry.calories ?? 0),
      proteinG: prev.proteinG + (entry.proteinG ?? 0),
      carbsG: prev.carbsG + (entry.carbsG ?? 0),
      fatG: prev.fatG + (entry.fatG ?? 0),
    }))
  }

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 max-w-3xl mx-auto px-1 py-2 space-y-8">

      {/* Header — gradient hero */}
      <ScrollReveal>
        <div
          className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
          style={{
            background: 'linear-gradient(120deg, #fef3c7 0%, #ffe2ad 44%, #ffd9bf 74%, #ffe1d2 100%)',
            boxShadow: '0 24px 60px -28px rgba(217, 119, 46, 0.42)',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
          <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,119,46,0.16), transparent 70%)' }} />
          <span className="shine-sweep" />
          <div className="relative flex items-end justify-between gap-4">
            <div>
              <span className="inline-block h-1.5 w-12 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #f5b13c, #ef7d2b)' }} />
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-[#2d3142]">
                {t('nutrition.title')}
              </h1>
            </div>
            <span className="text-xs font-medium tracking-widest uppercase pb-1 text-[#2d3142]/60">
              {t('nutrition.today')}
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Daily Macros */}
      <ScrollReveal delay={0.05}>
        <section>
          <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.daily_macros')}
          </p>
          <MacroDashboard targets={targets} consumed={consumed} />
        </section>
      </ScrollReveal>

      {/* This Week */}
      <ScrollReveal>
        <section>
          <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.this_week')}
          </p>
          <WeeklyChart days={week} target={targets.calories} selected={selectedDate} onSelectDay={setSelectedDate} />
        </section>
      </ScrollReveal>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Meal Planner */}
      <ScrollReveal>
        <section>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.meal_planner')}
          </p>
          <MealPlanner foodLog={foodLog} interactive={isToday} onAddMeal={handleAddMeal} />
        </section>
      </ScrollReveal>

      {/* Recipes */}
      <div className="h-px" style={{ background: 'var(--border)' }} />
      <ScrollReveal>
        <section>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
            {t('nutrition.recipes_heading')}
          </p>
          <RecipeBrowser />
        </section>
      </ScrollReveal>

      <AddFoodSheet
        meal={sheetMeal}
        open={sheetMeal !== null}
        onClose={() => setSheetMeal(null)}
        onLogged={handleLogged}
      />
      </div>
    </div>
  )
}
