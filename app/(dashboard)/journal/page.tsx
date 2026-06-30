'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalEntryForm } from '@/components/journal/JournalEntry'
import { ScrollReveal, Aurora } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'

export default function JournalPage() {
  const { t } = useLanguage()
  const [saved, setSaved] = useState(false)

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <ScrollReveal>
          <div
            className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
            style={{
              background: 'linear-gradient(120deg, #e7e0ff 0%, #ddd4ff 44%, #ece0ff 74%, #ffe0ee 100%)',
              boxShadow: '0 24px 60px -28px rgba(124, 92, 214, 0.42)',
            }}
          >
            <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
            <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,92,214,0.16), transparent 70%)' }} />
            <span className="shine-sweep" />
            <div className="relative">
              <span className="inline-block h-1.5 w-12 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #b69cff, #7c5cd6)' }} />
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-[#2d3142]">{t('journal.title')}</h1>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle>{t('journal.card_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEntryForm onSaved={() => setSaved(true)} />
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  )
}
