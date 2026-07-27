'use client'
import { ChevronLeft, ChevronRight, CalendarDays, CircleDot, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { formatJournalDate } from '@/lib/journal-format'

/** Every visible state the selected day can be in. */
export type JournalDayStatus = 'loading' | 'empty' | 'saved' | 'unsaved' | 'saving' | 'error'

interface JournalDayHeaderProps {
  date: string
  today: string
  status: JournalDayStatus
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  /** disables day navigation while a save is in flight */
  busy?: boolean
}

const STATUS_STYLE: Record<JournalDayStatus, string> = {
  loading: 'bg-muted text-muted-foreground',
  empty: 'bg-muted text-muted-foreground',
  saved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  unsaved: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  saving: 'bg-muted text-muted-foreground',
  error: 'bg-destructive/15 text-destructive',
}

function StatusIcon({ status }: { status: JournalDayStatus }) {
  const cls = 'size-3.5 shrink-0'
  if (status === 'saved') return <Check className={cls} aria-hidden />
  if (status === 'unsaved') return <CircleDot className={cls} aria-hidden />
  if (status === 'saving' || status === 'loading') return <Loader2 className={cn(cls, 'animate-spin')} aria-hidden />
  if (status === 'error') return <AlertCircle className={cls} aria-hidden />
  return <CalendarDays className={cls} aria-hidden />
}

/**
 * Selected-day header: the localized date, a Today marker, the live save state
 * and day navigation. Forward navigation stops at the user's logical today —
 * the product has no future planning, so a disabled control (with an accessible
 * name) is clearer than silently allowing an unreachable day.
 */
export function JournalDayHeader({
  date,
  today,
  status,
  onPrev,
  onNext,
  onToday,
  busy,
}: JournalDayHeaderProps) {
  const { t, locale } = useLanguage()
  const isToday = date === today
  const atEnd = date >= today

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold break-words sm:text-lg">
            {formatJournalDate(date, locale)}
          </h2>
          {isToday && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
              {t('journal.day.today')}
            </span>
          )}
        </div>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_STYLE[status]
          )}
        >
          <StatusIcon status={status} />
          {t(`journal.status.${status}`)}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={onToday} disabled={busy}>
            {t('journal.day.jump_today')}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label={t('journal.day.prev')}
          onClick={onPrev}
          disabled={busy}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('journal.day.next')}
          onClick={onNext}
          disabled={busy || atEnd}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
