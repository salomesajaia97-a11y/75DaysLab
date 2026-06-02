'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalEntryForm } from '@/components/journal/JournalEntry'
import { useLanguage } from '@/lib/i18n'

export default function JournalPage() {
  const { t } = useLanguage()
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('journal.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('journal.card_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEntryForm onSaved={() => setSaved(true)} />
        </CardContent>
      </Card>
    </div>
  )
}
