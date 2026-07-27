'use client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { MoodSelector } from './MoodSelector'
import {
  JOURNAL_FIELD_LIMITS,
  type JournalTextField,
  type ReflectionDraft,
} from '@/lib/journal'

interface ReflectionFormProps {
  draft: ReflectionDraft
  onChange: (patch: Partial<ReflectionDraft>) => void
  disabled?: boolean
}

/** Show a remaining-characters hint only as the limit gets close. */
const COUNTER_VISIBLE_AT = 0.8

function Counter({ field, value }: { field: JournalTextField; value: string }) {
  const { t } = useLanguage()
  const limit = JOURNAL_FIELD_LIMITS[field]
  if (value.length < limit * COUNTER_VISIBLE_AT) return null
  const left = limit - value.length
  return (
    <p className={cn('text-xs', left <= 0 ? 'text-destructive' : 'text-muted-foreground')}>
      {t('journal.field.chars_left', { n: Math.max(left, 0) })}
    </p>
  )
}

/**
 * The reflection fields for one day. Fully controlled — it owns no state, so a
 * date switch or a failed save can never desynchronize it from the draft the
 * container is holding (typed content is preserved across both).
 *
 * Every control has a real <label htmlFor>; the mood scale is a labelled
 * radiogroup. Inputs are hard-capped at the same lengths the API enforces.
 */
export function ReflectionForm({ draft, onChange, disabled }: ReflectionFormProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="mb-2 text-sm leading-none font-medium">{t('journal.mood.label')}</legend>
        <MoodSelector
          value={draft.mood}
          onChange={(mood) => onChange({ mood })}
          disabled={disabled}
        />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="journal-title">{t('journal.field.title')}</Label>
        <Input
          id="journal-title"
          value={draft.title}
          disabled={disabled}
          maxLength={JOURNAL_FIELD_LIMITS.title}
          placeholder={t('journal.field.title_placeholder')}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <Counter field="title" value={draft.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="journal-reflection">{t('journal.field.reflection')}</Label>
        <Textarea
          id="journal-reflection"
          rows={6}
          value={draft.reflection}
          disabled={disabled}
          maxLength={JOURNAL_FIELD_LIMITS.reflection}
          placeholder={t('journal.field.reflection_placeholder')}
          onChange={(e) => onChange({ reflection: e.target.value })}
          className="min-h-32"
        />
        <Counter field="reflection" value={draft.reflection} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="journal-gratitude">{t('journal.field.gratitude')}</Label>
        <Textarea
          id="journal-gratitude"
          rows={3}
          value={draft.gratitude}
          disabled={disabled}
          maxLength={JOURNAL_FIELD_LIMITS.gratitude}
          placeholder={t('journal.field.gratitude_placeholder')}
          onChange={(e) => onChange({ gratitude: e.target.value })}
        />
        <Counter field="gratitude" value={draft.gratitude} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="journal-tomorrow">{t('journal.field.tomorrow')}</Label>
        <Textarea
          id="journal-tomorrow"
          rows={3}
          value={draft.tomorrowFocus}
          disabled={disabled}
          maxLength={JOURNAL_FIELD_LIMITS.tomorrowFocus}
          placeholder={t('journal.field.tomorrow_placeholder')}
          onChange={(e) => onChange({ tomorrowFocus: e.target.value })}
        />
        <Counter field="tomorrowFocus" value={draft.tomorrowFocus} />
      </div>
    </div>
  )
}
