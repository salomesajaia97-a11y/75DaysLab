'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, Save } from 'lucide-react'
import type { IPageSection, IPageField } from '@/models/PageContent'

const PAGE_LABELS: Record<string, string> = {
  home: 'Home', dashboard: 'Dashboard', login: 'Login', register: 'Register',
  cycle: 'Cycle Tracker', nutrition: 'Nutrition', journal: 'Journal',
  water: 'Water Tracker', fitness: 'Fitness', ai: 'AI Coach',
  photos: 'Progress Photos', squads: 'Squads',
}

export default function PageEditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
  const [sections, setSections] = useState<IPageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/page-content/${pageId}`)
      .then((r) => r.json())
      .then((data) => setSections(data.sections ?? []))
      .catch(() => toast.error('Failed to load page content'))
      .finally(() => setLoading(false))
  }, [pageId])

  function updateField(sectionId: string, fieldKey: string, value: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.sectionId !== sectionId
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.key !== fieldKey ? f : { ...f, value }
              ),
            }
      )
    )
  }

  async function saveSection(section: IPageSection) {
    setSavingSection(section.sectionId)
    try {
      const res = await fetch(`/api/admin/page-content/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: section.sectionId, fields: section.fields }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success(`${section.label} saved`)
    } catch {
      toast.error('Failed to save section')
    } finally {
      setSavingSection(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link href="/admin/content" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Content
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{PAGE_LABELS[pageId] ?? pageId}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{PAGE_LABELS[pageId] ?? pageId}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit each section and save individually.
        </p>
      </div>

      <Accordion multiple className="space-y-3" defaultValue={sections.map((s) => s.sectionId)}>
        {sections.map((section) => (
          <AccordionItem
            key={section.sectionId}
            value={section.sectionId}
            className="border rounded-xl px-5 bg-card"
          >
            <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="space-y-4">
                {section.fields.map((field: IPageField) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">{field.label}</Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={field.value}
                        onChange={(e) => updateField(section.sectionId, field.key, e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    ) : (
                      <Input
                        type={field.type === 'url' ? 'url' : 'text'}
                        value={field.value}
                        onChange={(e) => updateField(section.sectionId, field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <Button
                  size="sm"
                  onClick={() => saveSection(section)}
                  disabled={savingSection === section.sectionId}
                  className="mt-2"
                >
                  {savingSection === section.sectionId ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1.5" />Save Section</>
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
