'use client'
import { FOCUS_AREAS, type FocusAreaDef } from '@/lib/fitness/workoutPlans'
import { focusAreaLabel } from '@/lib/fitness/i18n'
import { useLanguage } from '@/lib/i18n'

interface Props {
  selected: FocusAreaDef['id'] | null
  onSelect: (id: FocusAreaDef['id'] | null) => void
}

export function FocusAreaChips({ selected, onSelect }: Props) {
  const { locale } = useLanguage()
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
      {FOCUS_AREAS.map(area => {
        const active = selected === area.id
        return (
          <button
            key={area.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : area.id)}
            className="flex shrink-0 flex-col items-center gap-1.5 focus:outline-none"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-all ${
                active
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'ring-1 ring-border'
              }`}
              style={{
                background: active
                  ? 'linear-gradient(135deg, #d6f5e2 0%, #cdeee6 100%)'
                  : 'linear-gradient(135deg, #f6f7f9 0%, #eef0f3 100%)',
              }}
            >
              {area.emoji}
            </span>
            <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              {focusAreaLabel(area.id, locale, area.label)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
