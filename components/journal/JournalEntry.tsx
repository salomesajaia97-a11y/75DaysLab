'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BookOpen, Loader2, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface JournalEntryFormProps {
  existingEntry?: { bookTitle: string; pagesRead: number; notes: string }
  onSaved: () => void
}

export function JournalEntryForm({ existingEntry, onSaved }: JournalEntryFormProps) {
  const { t } = useLanguage()
  const [bookTitle, setBookTitle] = useState(existingEntry?.bookTitle ?? '')
  const [pagesRead, setPagesRead] = useState(existingEntry?.pagesRead?.toString() ?? '')
  const [notes, setNotes] = useState(existingEntry?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/journal?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.bookTitle) {
          setBookTitle(data.bookTitle)
          setPagesRead(String(data.pagesRead ?? ''))
          setNotes(data.notes ?? '')
        }
      })
      .catch(() => {})
  }, [])

  const pages = parseInt(pagesRead) || 0
  const isComplete = bookTitle.trim() && pages >= 10

  async function save() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookTitle: bookTitle.trim(), pagesRead: pages, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t('journal.save_failed'))
        return
      }
      setSaved(true)
      onSaved()
    } catch {
      setError(t('journal.save_failed_retry'))
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="font-semibold text-lg">{t('journal.logged')}</p>
        <p className="text-muted-foreground text-sm">{t('journal.pages_summary', { title: bookTitle, pages: pagesRead })}</p>
        <Button variant="outline" onClick={() => setSaved(false)}>{t('journal.log_more')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <BookOpen className="h-4 w-4" />
        <span className="text-sm">{t('journal.min_pages')}</span>
      </div>
      <div className="space-y-2">
        <Label>{t('journal.book_title')}</Label>
        <Input placeholder={t('journal.book_placeholder')} value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('journal.pages_today')}</Label>
        <Input type="number" min="0" placeholder="10" value={pagesRead} onChange={e => setPagesRead(e.target.value)} />
        {pages > 0 && pages < 10 && (
          <p className="text-xs text-destructive">{t('journal.pages_needed', { n: 10 - pages })}</p>
        )}
        {pages >= 10 && (
          <p className="text-xs text-green-500">✓ {t('journal.goal_met')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t('journal.notes')}</Label>
        <Textarea placeholder={t('journal.notes_placeholder')} value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button className="w-full" onClick={save} disabled={!isComplete || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {t('journal.save')}
      </Button>
    </div>
  )
}
