'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalEntryForm } from '@/components/journal/JournalEntry'
import { JournalExperience } from '@/components/journal/JournalExperience'
import { ScrollReveal, Aurora } from '@/components/shared/Motion'
import { useLanguage } from '@/lib/i18n'

export default function JournalPage() {
  const { t } = useLanguage()

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 mx-auto max-w-2xl space-y-6">
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
              <p className="mt-3 max-w-md text-sm text-[#4a4d63] md:text-base">{t('journal.subtitle')}</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Daily reflection — persistent, editable, browsable. */}
        <ScrollReveal delay={0.08}>
          <JournalExperience />
        </ScrollReveal>

        {/* Reading log — the existing challenge task. Untouched by the
            reflection feature; it is the only thing that can flip
            `journalCompleted`. */}
        <ScrollReveal delay={0.16}>
          <Card>
            <CardHeader>
              <CardTitle>{t('journal.card_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEntryForm onSaved={() => {}} />
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  )
}
