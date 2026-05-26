'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalEntryForm } from '@/components/journal/JournalEntry'

export default function JournalPage() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Reading &amp; Journal</h1>
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Reading</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEntryForm onSaved={() => setSaved(true)} />
        </CardContent>
      </Card>
    </div>
  )
}
