'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BookOpen, Loader2, CheckCircle } from 'lucide-react'

interface JournalEntryFormProps {
  existingEntry?: { bookTitle: string; pagesRead: number; notes: string }
  onSaved: () => void
}

export function JournalEntryForm({ existingEntry, onSaved }: JournalEntryFormProps) {
  const [bookTitle, setBookTitle] = useState(existingEntry?.bookTitle ?? '')
  const [pagesRead, setPagesRead] = useState(existingEntry?.pagesRead?.toString() ?? '')
  const [notes, setNotes] = useState(existingEntry?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const pages = parseInt(pagesRead) || 0
  const isComplete = bookTitle.trim() && pages >= 10

  function save() {
    setLoading(true)
    // Phase 1: mock save
    setTimeout(() => {
      setLoading(false)
      setSaved(true)
      onSaved()
    }, 600)
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="font-semibold text-lg">Reading logged!</p>
        <p className="text-muted-foreground text-sm">{bookTitle} · {pagesRead} pages</p>
        <Button variant="outline" onClick={() => setSaved(false)}>Log more</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <BookOpen className="h-4 w-4" />
        <span className="text-sm">Minimum 10 pages required to complete today&apos;s reading</span>
      </div>
      <div className="space-y-2">
        <Label>Book Title</Label>
        <Input placeholder="What are you reading?" value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Pages Read Today</Label>
        <Input type="number" min="0" placeholder="10" value={pagesRead} onChange={e => setPagesRead(e.target.value)} />
        {pages > 0 && pages < 10 && (
          <p className="text-xs text-destructive">{10 - pages} more pages needed</p>
        )}
        {pages >= 10 && (
          <p className="text-xs text-green-500">✓ Reading goal met</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea placeholder="Key insights, quotes, reflections..." value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
      </div>
      <Button className="w-full" onClick={save} disabled={!isComplete || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Reading Log
      </Button>
    </div>
  )
}
