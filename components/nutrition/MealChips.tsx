'use client'
import { MEAL_ORDER, type MealType } from '@/lib/nutrition-meal'
import { useLanguage } from '@/lib/i18n'

interface MealChipsProps {
  value: MealType
  onChange: (m: MealType) => void
}

export function MealChips({ value, onChange }: MealChipsProps) {
  const { t } = useLanguage()
  return (
    <div className="flex gap-2 mb-3">
      {MEAL_ORDER.map(m => {
        const active = m === value
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200"
            style={{
              background: active ? 'var(--foreground)' : 'var(--muted)',
              color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            }}
          >
            {t(`nutrition.meal_${m}`)}
          </button>
        )
      })}
    </div>
  )
}
