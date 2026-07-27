'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/lib/i18n'
import { addDays } from '@/lib/streak'
import {
  EMPTY_REFLECTION,
  isReflectionEmpty,
  reflectionsEqual,
  toReflectionDraft,
  type ReflectionDraft,
} from '@/lib/journal'
import { JournalDayHeader, type JournalDayStatus } from './JournalDayHeader'
import { ReflectionForm } from './ReflectionForm'
import { JournalHistory } from './JournalHistory'

/** How long the "saved" confirmation stays on screen (ms). */
const SUCCESS_MS = 4000

type LoadState = 'loading' | 'ready' | 'error'

/**
 * Container for the daily reflection experience: it owns the selected day, the
 * server-truth entry, the working draft and every transient state, and renders
 * the header / form / history around them.
 *
 * Day keys are NEVER computed on the client. The first request omits `?date=`
 * so the server answers with the canonical logical today (challenge/user
 * timezone + day-key version); navigation then steps from that key with the
 * shared pure `addDays`.
 *
 * Unsaved work is never silently lost: switching dates stashes the dirty draft
 * in an in-memory map keyed by date and restores it when you come back (with a
 * visible notice), and leaving the tab while dirty triggers the browser's own
 * confirmation. No global draft store, no persistence side effects.
 */
export function JournalExperience() {
  const { t } = useLanguage()

  const [today, setToday] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [load, setLoad] = useState<LoadState>('loading')
  const [savedDraft, setSavedDraft] = useState<ReflectionDraft>({ ...EMPTY_REFLECTION })
  const [draft, setDraft] = useState<ReflectionDraft>({ ...EMPTY_REFLECTION })
  const [restored, setRestored] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErrorCode, setSaveErrorCode] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  /** Dirty drafts for days the user navigated away from, keyed by date. */
  const stashRef = useRef(new Map<string, ReflectionDraft>())
  /** Guards against an out-of-order response overwriting a newer day. */
  const requestRef = useRef(0)
  /** Synchronous duplicate-submit guard (state updates are async). */
  const savingRef = useRef(false)

  const dirty = !reflectionsEqual(draft, savedDraft)
  const empty = isReflectionEmpty(draft)

  /**
   * Load one day. State is only touched AFTER the request resolves — callers
   * that want a visible spinner flip `load` to 'loading' themselves (see
   * `selectDate` and the retry buttons), which keeps the mount effect free of
   * synchronous state updates.
   */
  const fetchDay = useCallback(async (target?: string) => {
    const id = ++requestRef.current
    try {
      const url = target
        ? `/api/journal/reflection?date=${encodeURIComponent(target)}`
        : '/api/journal/reflection'
      const res = await fetch(url)
      if (id !== requestRef.current) return
      setSaveErrorCode(null)
      setJustSaved(false)
      if (!res.ok) {
        setLoad('error')
        return
      }
      const body = await res.json()
      if (id !== requestRef.current) return

      const resolvedDate: string = typeof body?.date === 'string' ? body.date : (target ?? '')
      const fromServer = body?.entry ? toReflectionDraft(body.entry) : { ...EMPTY_REFLECTION }
      const stashed = stashRef.current.get(resolvedDate)

      setToday(typeof body?.today === 'string' ? body.today : resolvedDate)
      setDate(resolvedDate)
      setSavedDraft(fromServer)
      setDraft(stashed ?? fromServer)
      setRestored(Boolean(stashed && !reflectionsEqual(stashed, fromServer)))
      setLoad('ready')
    } catch {
      if (id !== requestRef.current) return
      setSaveErrorCode(null)
      setLoad('error')
    }
  }, [])

  /** Show the spinner, then load — used by every user-initiated navigation. */
  const goToDay = useCallback(
    (target?: string) => {
      setLoad('loading')
      void fetchDay(target)
    },
    [fetchDay]
  )

  // Kicked off on a microtask so the effect body itself performs no state
  // update (react-hooks/set-state-in-effect); `load` starts as 'loading', and
  // fetchDay only touches state once its response has resolved.
  useEffect(() => {
    void Promise.resolve().then(() => fetchDay())
  }, [fetchDay])

  // Auto-dismiss the save confirmation.
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), SUCCESS_MS)
    return () => clearTimeout(timer)
  }, [justSaved])

  // Warn before a full page unload discards unsaved text.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /** Move to another day, stashing (never discarding) unsaved work first. */
  const selectDate = useCallback(
    (next: string) => {
      if (saving || next === date) return
      if (date) {
        if (!reflectionsEqual(draft, savedDraft)) stashRef.current.set(date, draft)
        else stashRef.current.delete(date)
      }
      goToDay(next)
    },
    [date, draft, savedDraft, saving, goToDay]
  )

  const patch = useCallback((p: Partial<ReflectionDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setJustSaved(false)
  }, [])

  async function save() {
    if (savingRef.current || !date || saving || !dirty || empty) return
    savingRef.current = true
    setSaving(true)
    setSaveErrorCode(null)
    try {
      const res = await fetch('/api/journal/reflection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...draft }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        // Typed content is deliberately left untouched so nothing is lost.
        setSaveErrorCode(typeof body?.code === 'string' ? body.code : 'save_failed')
        return
      }
      // Adopt the server-normalized (trimmed) values as the new saved truth.
      const stored = body?.entry ? toReflectionDraft(body.entry) : draft
      setSavedDraft(stored)
      setDraft(stored)
      setRestored(false)
      stashRef.current.delete(date)
      setJustSaved(true)
      setRefreshKey((k) => k + 1)
    } catch {
      setSaveErrorCode('network')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const status: JournalDayStatus = saving
    ? 'saving'
    : load === 'loading'
      ? 'loading'
      : load === 'error'
        ? 'error'
        : dirty
          ? 'unsaved'
          : isReflectionEmpty(savedDraft)
            ? 'empty'
            : 'saved'

  // First paint, before the canonical logical day is known.
  if (!date || !today) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6" aria-busy="true">
          <p className="sr-only" role="status">
            {t('journal.status.loading')}
          </p>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          {load === 'error' && (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {t('journal.status.load_failed')}
              </p>
              <Button variant="outline" size="sm" onClick={() => goToDay()}>
                <RotateCcw aria-hidden />
                {t('journal.action.retry')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <JournalDayHeader
            date={date}
            today={today}
            status={status}
            busy={saving}
            onPrev={() => selectDate(addDays(date, -1))}
            onNext={() => selectDate(addDays(date, 1))}
            onToday={() => selectDate(today)}
          />
        </CardHeader>
        <CardContent className="space-y-5">
          {load === 'error' ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {t('journal.status.load_failed')}
              </p>
              <Button variant="outline" size="sm" onClick={() => goToDay(date)}>
                <RotateCcw aria-hidden />
                {t('journal.action.retry')}
              </Button>
            </div>
          ) : (
            <>
              {restored && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
                  {t('journal.unsaved.restored')}
                </p>
              )}

              <ReflectionForm draft={draft} onChange={patch} disabled={load === 'loading'} />

              {saveErrorCode && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {t(`journal.error.${saveErrorCode}`)}
                </p>
              )}

              {justSaved && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  {t('journal.status.save_success')}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="order-2 text-xs text-muted-foreground sm:order-1">
                  {empty
                    ? t('journal.action.save_hint_empty')
                    : dirty
                      ? t('journal.action.save_hint_dirty')
                      : t('journal.action.save_hint_clean')}
                </p>
                <Button
                  size="lg"
                  className="order-1 w-full sm:order-2 sm:w-auto"
                  onClick={() => void save()}
                  disabled={saving || load === 'loading' || !dirty || empty}
                >
                  {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                  {saving ? t('journal.action.saving') : t('journal.action.save')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('journal.history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalHistory selectedDate={date} onSelect={selectDate} refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  )
}
