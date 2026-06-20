'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Theme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  fontFamily: 'jakarta' | 'fraunces' | 'nunito' | 'georgian'
  fontSize: 'sm' | 'md' | 'lg'
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const DEFAULT_THEME: Theme = {
  primaryColor: '#2d3142',
  accentColor: '#ede9e3',
  backgroundColor: '#f5f3ef',
  textColor: '#2d3142',
  fontFamily: 'fraunces',
  fontSize: 'md',
  borderRadius: 'md',
}

const FONT_LABELS: Record<Theme['fontFamily'], string> = {
  jakarta:  'Plus Jakarta Sans',
  fraunces: 'Fraunces',
  nunito:   'Nunito',
  georgian: 'Noto Sans Georgian',
}

const RADIUS_LABELS: Record<Theme['borderRadius'], string> = {
  none: 'None',
  sm:   'Small',
  md:   'Medium',
  lg:   'Large',
  full: 'Pill',
}

const RADIUS_VALUES: Record<Theme['borderRadius'], string> = {
  none: '0px',
  sm:   '0.25rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  full: '9999px',
}

export default function ThemePage() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then((r) => r.json())
      .then((data) => { if (data.theme) setTheme(data.theme) })
      .finally(() => setLoading(false))
  }, [])

  // Apply theme to preview div as inline CSS vars
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    el.style.setProperty('--preview-primary', theme.primaryColor)
    el.style.setProperty('--preview-accent', theme.accentColor)
    el.style.setProperty('--preview-bg', theme.backgroundColor)
    el.style.setProperty('--preview-text', theme.textColor)
    el.style.setProperty('--preview-radius', RADIUS_VALUES[theme.borderRadius])
    const fontMap: Record<string, string> = {
      jakarta:  'var(--font-jakarta), sans-serif',
      fraunces: 'var(--font-fraunces), Georgia, serif',
      nunito:   'var(--font-caveat), sans-serif',
      georgian: 'var(--font-noto-georgian), sans-serif',
    }
    el.style.setProperty('font-family', fontMap[theme.fontFamily])
    const sizeMap: Record<string, string> = { sm: '13px', md: '15px', lg: '17px' }
    el.style.setProperty('font-size', sizeMap[theme.fontSize])
  }, [theme])

  function update<K extends keyof Theme>(key: K, value: Theme[K]) {
    setTheme((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Theme saved — reload the page to see global changes.')
    } catch {
      toast.error('Failed to save theme')
    } finally {
      setSaving(false)
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Theme Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Change colors, fonts, and radius. Preview updates live. Save applies globally on next page load.
        </p>
      </div>

      <div className="grid grid-cols-[400px_1fr] gap-8 items-start">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Theme Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Colors */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colors</p>
              {(
                [
                  { key: 'primaryColor',    label: 'Primary' },
                  { key: 'accentColor',     label: 'Accent' },
                  { key: 'backgroundColor', label: 'Background' },
                  { key: 'textColor',       label: 'Text' },
                ] as { key: keyof Theme; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label className="text-sm">{label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{theme[key] as string}</span>
                    <input
                      type="color"
                      value={theme[key] as string}
                      onChange={(e) => update(key, e.target.value as Theme[keyof Theme])}
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Font family */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Font Family</p>
              <Select value={theme.fontFamily} onValueChange={(v) => update('fontFamily', v as Theme['fontFamily'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FONT_LABELS) as Theme['fontFamily'][]).map((f) => (
                    <SelectItem key={f} value={f}>{FONT_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Font Size</p>
              <div className="flex gap-2">
                {(['sm', 'md', 'lg'] as Theme['fontSize'][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => update('fontSize', s)}
                    className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors ${theme.fontSize === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
                  >
                    {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Border Radius</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(RADIUS_LABELS) as Theme['borderRadius'][]).map((r) => (
                  <button
                    key={r}
                    onClick={() => update('borderRadius', r)}
                    className={`px-3 py-1.5 text-xs border transition-colors flex items-center gap-1.5 ${theme.borderRadius === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
                    style={{ borderRadius: RADIUS_VALUES[r] }}
                  >
                    {RADIUS_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Theme'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={previewRef}
              className="rounded-xl p-6 space-y-4 border"
              style={{
                background: 'var(--preview-bg, #f5f3ef)',
                color: 'var(--preview-text, #2d3142)',
                borderRadius: 'var(--preview-radius, 0.5rem)',
              }}
            >
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--preview-text)' }}>
                  Welcome back
                </h2>
                <p className="text-sm mt-1" style={{ opacity: 0.7 }}>
                  Your 75-day challenge is on track.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-white"
                  style={{
                    background: 'var(--preview-primary)',
                    borderRadius: 'var(--preview-radius)',
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium border"
                  style={{
                    background: 'var(--preview-accent)',
                    color: 'var(--preview-text)',
                    borderColor: 'var(--preview-primary)',
                    borderRadius: 'var(--preview-radius)',
                  }}
                >
                  Accent Button
                </button>
              </div>

              <div
                className="p-4 border"
                style={{
                  background: 'var(--preview-accent)',
                  borderColor: 'var(--preview-primary)',
                  borderRadius: 'var(--preview-radius)',
                }}
              >
                <p className="text-sm font-medium">Card Component</p>
                <p className="text-xs mt-1" style={{ opacity: 0.7 }}>
                  This is how cards will look with the current theme.
                </p>
              </div>

              <input
                type="text"
                placeholder="Input field preview"
                readOnly
                className="w-full px-3 py-2 text-sm border outline-none"
                style={{
                  background: 'var(--preview-bg)',
                  color: 'var(--preview-text)',
                  borderColor: 'var(--preview-primary)',
                  borderRadius: 'var(--preview-radius)',
                }}
              />

              <div className="flex items-center gap-2 flex-wrap">
                {['Active', 'Day 14', 'Pro'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-medium text-white"
                    style={{
                      background: 'var(--preview-primary)',
                      borderRadius: '9999px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
