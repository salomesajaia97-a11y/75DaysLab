'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Trash2, Upload, Plus, Video, ImageIcon, Zap, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { IFitnessMedia, FitnessMediaType, FitnessMediaCategory } from '@/models/FitnessMedia'

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES: { value: FitnessMediaCategory; label: string }[] = [
  { value: 'full', label: 'Full Body' },
  { value: 'core', label: 'Core' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'yoga', label: 'Yoga' },
]

const TYPE_META: Record<FitnessMediaType, { label: string; icon: React.ReactNode; color: string }> = {
  video: { label: 'Video', icon: <Video className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
  gif: { label: 'GIF', icon: <ImageIcon className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
  lottie: { label: 'Lottie', icon: <Zap className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700' },
}

// ─── Types ──────────────────────────────────────────────────────────────────

type MediaItem = IFitnessMedia & { _id: string }

interface FormState {
  title: string
  type: FitnessMediaType
  url: string
  category: FitnessMediaCategory
  order: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  type: 'video',
  url: '',
  category: 'full',
  order: '0',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FitnessMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<FitnessMediaCategory | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/fitness-media')
      const data = await res.json()
      setItems(data)
    } catch {
      toast.error('Failed to load media')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/fitness-media/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(f => ({ ...f, url: data.url }))
      toast.success('File uploaded — URL filled in below')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Title and URL are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/fitness-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          url: form.url.trim(),
          category: form.category,
          order: Number(form.order) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Media added')
      setItems(prev => [data, ...prev])
      setForm(DEFAULT_FORM)
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/fitness-media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setItems(prev => prev.filter(i => i._id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fitness Media</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage videos, GIFs and Lottie animations shown on the Fitness page
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Media'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">New Media Item</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Bodyweight Squat Tutorial"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <div className="flex gap-2">
                {(['video', 'gif', 'lottie'] as FitnessMediaType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      form.type === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {TYPE_META[t].icon}
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as FitnessMediaCategory }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Order */}
            <div className="space-y-1.5">
              <Label>Order (lower = first)</Label>
              <Input
                type="number"
                value={form.order}
                onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* URL + upload */}
          <div className="space-y-1.5">
            <Label>
              URL *{' '}
              <span className="font-normal text-muted-foreground">
                {form.type === 'video'
                  ? '(YouTube or Vimeo link)'
                  : '(paste URL or upload file below)'}
              </span>
            </Label>
            <Input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder={
                form.type === 'video'
                  ? 'https://youtube.com/watch?v=...'
                  : 'https://res.cloudinary.com/...'
              }
            />
          </div>

          {form.type !== 'video' && (
            <div className="space-y-1.5">
              <Label>Or upload file ({form.type === 'gif' ? 'GIF' : 'Lottie JSON'})</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept={form.type === 'gif' ? 'image/gif' : '.json,application/json'}
                  onChange={handleUpload}
                  className="hidden"
                  id="fitness-media-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading…' : 'Choose File'}
                </Button>
                {form.url && (
                  <span className="text-xs text-emerald-600 font-medium">✓ URL set from upload</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM) }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...CATEGORIES.map(c => c.value)] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterCat === cat
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat === 'all' ? `All (${items.length})` : `${CATEGORIES.find(c => c.value === cat)?.label} (${items.filter(i => i.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Media grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-3xl">🎬</p>
          <p className="font-semibold text-gray-700">No media yet</p>
          <p className="text-sm text-gray-400">Click "Add Media" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const tm = TYPE_META[item.type]
            const cat = CATEGORIES.find(c => c.value === item.category)
            return (
              <div
                key={item._id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                {/* Preview area */}
                <div className="relative flex aspect-video items-center justify-center bg-gray-50">
                  {item.type === 'gif' ? (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : item.type === 'video' ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Video className="h-8 w-8" />
                      <span className="text-xs text-center px-2 line-clamp-2">{item.url}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-amber-500">
                      <Zap className="h-8 w-8" />
                      <span className="text-xs text-gray-400 text-center px-2 line-clamp-1">
                        {item.url.split('/').pop()}
                      </span>
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(item._id)}
                    disabled={deletingId === item._id}
                    className="absolute top-2 right-2 rounded-lg bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === item._id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5 p-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tm.color}`}>
                      {tm.icon}
                      {tm.label}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {cat?.label}
                    </span>
                    {item.order !== 0 && (
                      <span className="text-xs text-gray-400 ml-auto">#{item.order}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
