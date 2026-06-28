'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MacroDashboard } from '@/components/nutrition/MacroDashboard'
import { AddFoodSheet } from '@/components/nutrition/AddFoodSheet'
import { WeeklyChart } from '@/components/nutrition/WeeklyChart'
import { MealPlanner } from '@/components/nutrition/MealPlanner'
import { RecipeBrowser } from '@/components/recipes/RecipeBrowser'
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
    <div className="max-w-3xl mx-auto px-1 py-2 space-y-8">

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

      {/* This Week */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.this_week')}
        </p>
        <WeeklyChart days={week} target={targets.calories} selected={selectedDate} onSelectDay={setSelectedDate} />
      </section>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border)' }} />

      {/* Meal Planner */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.meal_planner')}
        </p>
        <MealPlanner foodLog={foodLog} interactive={isToday} onAddMeal={handleAddMeal} />
      </section>

      {/* Recipes */}
      <div className="h-px" style={{ background: 'var(--border)' }} />
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {t('nutrition.recipes_heading')}
        </p>
        <RecipeBrowser />
      </section>

      <AddFoodSheet
        meal={sheetMeal}
        open={sheetMeal !== null}
        onClose={() => setSheetMeal(null)}
        onLogged={handleLogged}
      />
    </div>
  )
}
