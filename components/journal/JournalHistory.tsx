'use client'
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import { formatMonthLabel, formatShortJournalDate, monthKey } from '@/lib/journal-format'
import { isJournalMood, type JournalMood } from '@/lib/journal'
import { MOOD_FACE } from './MoodSelector'

/** How far back the history list reaches (bounded server-side too). */
const HISTORY_DAYS = 90

interface HistoryItem {
  date: string
  mood: JournalMood | null
  title: string
  preview: string
}

interface JournalHistoryProps {
  selectedDate: string
  onSelect: (date: string) => void
  /** bump to refetch after a save */
  refreshKey: number
}

type LoadState = 'loading' | 'ready' | 'error'

function coerce(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const o = row as Record<string, unknown>
    if (typeof o.date !== 'string') return []
    return [
      {
        date: o.date,
        mood: isJournalMood(o.mood) ? o.mood : null,
        title: typeof o.title === 'string' ? o.title : '',
        preview: typeof o.preview === 'string' ? o.preview : '',
      },
    ]
  })
}

/** Group consecutive (already newest-first) entries under their month. */
function groupByMonth(items: HistoryItem[]): { key: string; items: HistoryItem[] }[] {
  const groups: { key: string; items: HistoryItem[] }[] = []
  for (const item of items) {
    const key = monthKey(item.date)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, items: [item] })
  }
  return groups
}

/**
 * Chronological history of past reflections, grouped by month, newest first.
 * Selecting a row loads that date into the editor above. Only the authenticated
 * user's entries are ever returned — the route scopes every query by session id
 * and this component never sends a user identifier.
 */
export function JournalHistory({ selectedDate, onSelect, refreshKey }: JournalHistoryProps) {
  const { t, locale } = useLanguage()
  const [state, setState] = useState<LoadState>('loading')
  const [items, setItems] = useState<HistoryItem[]>([])

  // State is only touched after the response resolves: a background refresh
  // (after a save) keeps the current list on screen instead of flashing
  // skeletons, and the mount effect performs no synchronous state update.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/journal/history?days=${HISTORY_DAYS}`)
      if (!res.ok) {
        setState('error')
        return
      }
      const body = await res.json()
      setItems(coerce(body?.entries))
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  // Kicked off on a microtask so the effect body itself performs no state
  // update (react-hooks/set-state-in-effect); `load` only touches state once
  // its response has resolved.
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load, refreshKey])

  if (state === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true">
        <p className="sr-only" role="status">
          {t('journal.history.loading')}
        </p>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {t('journal.history.failed')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setState('loading')
            void load()
          }}
        >
          {t('journal.history.retry')}
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <BookMarked className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{t('journal.history.empty_title')}</p>
        <p className="text-xs text-muted-foreground">{t('journal.history.empty_hint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groupByMonth(items).map((group) => (
        <section key={group.key} className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatMonthLabel(`${group.key}-01`, locale)}
          </h3>
          <ul className="space-y-2">
            {group.items.map((item) => {
              const active = item.date === selectedDate
              const summary = item.title || item.preview
              return (
                <li key={item.date}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(item.date)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                      'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    )}
                  >
                    <span aria-hidden className="text-lg leading-none">
                      {item.mood ? MOOD_FACE[item.mood] : '📝'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium">
                          {formatShortJournalDate(item.date, locale)}
                        </span>
                        {item.mood && (
                          <span className="text-xs text-muted-foreground">
                            {t(`journal.mood.${item.mood}`)}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {summary || t('journal.history.no_text')}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
