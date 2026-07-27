'use client'
import { useRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { JOURNAL_MOODS, type JournalMood } from '@/lib/journal'

/** Face for each mood. Purely decorative — the localized label is the a11y name. */
export const MOOD_FACE: Record<JournalMood, string> = {
  very_low: '😞',
  low: '🙁',
  neutral: '😐',
  good: '🙂',
  great: '😄',
}

interface MoodSelectorProps {
  value: JournalMood | null
  onChange: (mood: JournalMood | null) => void
  disabled?: boolean
}

/**
 * The five-point mood scale as an ARIA radiogroup.
 *
 * Accessibility: every option is a real focusable button exposing
 * `role="radio"` + `aria-checked`; roving arrow-key navigation moves and
 * selects, matching native radio behavior. Selection is signalled by THREE
 * independent cues (border/ring, a check badge, bolder label) so it never
 * depends on color alone. Re-clicking the selected mood clears it.
 */
export function MoodSelector({ value, onChange, disabled }: MoodSelectorProps) {
  const { t } = useLanguage()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + JOURNAL_MOODS.length) % JOURNAL_MOODS.length
    onChange(JOURNAL_MOODS[next])
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('journal.mood.label')}
      className="grid grid-cols-5 gap-1.5 sm:gap-2"
    >
      {JOURNAL_MOODS.map((mood, i) => {
        const selected = value === mood
        const label = t(`journal.mood.${mood}`)
        return (
          <button
            key={mood}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            disabled={disabled}
            ref={(el) => {
              refs.current[i] = el
            }}
            tabIndex={selected || (value === null && i === 0) ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(selected ? null : mood)}
            className={cn(
              'relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors',
              'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                : 'border-border bg-background hover:bg-muted'
            )}
          >
            {selected && (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
            <span aria-hidden className="text-xl leading-none">
              {MOOD_FACE[mood]}
            </span>
            <span
              className={cn(
                'text-[0.62rem] leading-tight break-words sm:text-[0.7rem]',
                selected ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
