'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Loader2,
  ArrowUpDown,
} from 'lucide-react'

const MODEL_LABELS: Record<string, string> = {
  user: 'Users', challenge: 'Challenges', squad: 'Squads', photo: 'Photos',
  cyclelog: 'Cycle Logs', dailylog: 'Daily Logs', foodlog: 'Food Logs',
  waterlog: 'Water Logs', journalentry: 'Journal Entries',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>

const MAX_COLS = 6

function getColumns(docs: Doc[]): string[] {
  if (!docs.length) return []
  const keys = Object.keys(docs[0])
  const withId = ['_id', ...keys.filter((k) => k !== '_id')]
  return withId.slice(0, MAX_COLS)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 40)
  const str = String(value)
  return str.length > 40 ? str.slice(0, 40) + '…' : str
}

function AutoForm({ doc, onChange }: { doc: Doc; onChange: (d: Doc) => void }) {
  const entries = Object.entries(doc).filter(([k]) => k !== '_id' && k !== '__v')
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {entries.map(([key, value]) => {
        const type = typeof value
        return (
          <div key={key} className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">{key}</Label>
            {type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!doc[key]}
                  onCheckedChange={(v) => onChange({ ...doc, [key]: v })}
                />
                <span className="text-sm">{doc[key] ? 'true' : 'false'}</span>
              </div>
            ) : type === 'object' ? (
              <Textarea
                rows={3}
                className="font-mono text-xs resize-none"
                value={JSON.stringify(doc[key], null, 2)}
                onChange={(e) => {
                  try { onChange({ ...doc, [key]: JSON.parse(e.target.value) }) } catch { /* keep raw */ }
                }}
              />
            ) : (
              <Input
                type={type === 'number' ? 'number' : 'text'}
                value={String(doc[key] ?? '')}
                onChange={(e) => onChange({ ...doc, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CollectionPage({ params }: { params: Promise<{ model: string }> }) {
  const { model } = use(params)
  const [docs, setDocs] = useState<Doc[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [readOnly, setReadOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const [editDoc, setEditDoc] = useState<Doc | null>(null)
  const [editDraft, setEditDraft] = useState<Doc>({})
  const [editMode, setEditMode] = useState<'edit' | 'view' | 'new'>('view')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = getColumns(docs)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), search, sort, dir })
      const res = await fetch(`/api/admin/collections/${model}?${qs}`)
      const data = await res.json()
      setDocs(data.docs ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
      setReadOnly(data.readOnly ?? false)
    } catch {
      toast.error('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [model, page, search, sort, dir])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  function openEdit(doc: Doc, mode: 'edit' | 'view') {
    setEditDoc(doc)
    setEditDraft({ ...doc })
    setEditMode(mode)
  }

  function openNew() {
    if (!docs.length) return toast.error('No documents to derive schema from')
    const template = Object.fromEntries(
      Object.entries(docs[0]).map(([k, v]) => {
        if (k === '_id' || k === '__v') return [k, '']
        if (typeof v === 'boolean') return [k, false]
        if (typeof v === 'number') return [k, 0]
        if (Array.isArray(v)) return [k, []]
        if (typeof v === 'object' && v !== null) return [k, {}]
        return [k, '']
      })
    )
    setEditDoc(null)
    setEditDraft(template)
    setEditMode('new')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { _id, __v, ...body } = editDraft
      if (editMode === 'new') {
        const res = await fetch(`/api/admin/collections/${model}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Document created')
      } else {
        const res = await fetch(`/api/admin/collections/${model}/${_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Document updated')
      }
      setEditDoc(null)
      fetchDocs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/collections/${model}/${deleteTarget._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Document deleted')
      setDeleteTarget(null)
      fetchDocs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function exportCSV() {
    const header = columns.join(',')
    const rows = docs.map((d) => columns.map((c) => `"${formatCell(d[c])}"`).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model}.csv`
    a.click()
  }

  function toggleSort(col: string) {
    if (sort === col) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(col); setDir('desc') }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link href="/admin/collections" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Collections
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{MODEL_LABELS[model] ?? model}</span>
        {readOnly && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Read Only</span>}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{MODEL_LABELS[model] ?? model}</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b text-xs text-muted-foreground uppercase tracking-wide">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {col}
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">No documents found</td></tr>
              ) : (
                docs.map((doc, i) => (
                  <tr key={String(doc._id)} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 font-mono text-xs max-w-[160px] truncate">
                        {formatCell(doc[col])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {readOnly ? (
                          <button onClick={() => openEdit(doc, 'view')} className="p-1.5 rounded hover:bg-muted" title="View">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => openEdit(doc, 'edit')} className="p-1.5 rounded hover:bg-muted" title="Edit">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteTarget(doc)} className="p-1.5 rounded hover:bg-red-50" title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(pages)} disabled={page === pages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit/View/New modal */}
      <Dialog open={editDoc !== null || editMode === 'new'} onOpenChange={(open) => { if (!open) setEditDoc(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editMode === 'new' ? `New ${MODEL_LABELS[model] ?? model}` :
               editMode === 'view' ? 'View Document' : 'Edit Document'}
            </DialogTitle>
          </DialogHeader>

          {editMode === 'view' ? (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto font-mono text-xs">
              {Object.entries(editDraft).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-32">{k}:</span>
                  <span className="break-all">{formatCell(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <AutoForm doc={editDraft} onChange={setEditDraft} />
          )}

          {editMode !== 'view' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : 'Save'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete document <span className="font-mono text-xs">{formatCell(deleteTarget?._id)}</span>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
