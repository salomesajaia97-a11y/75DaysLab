'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'

interface Plan {
  _id: string
  name: string
  slug: string
  price: number
  yearlyPrice: number
  features: string[]
  limits: { aiMessages: number; photoStorage: number; squadSize: number }
  isActive: boolean
  stripePriceId?: string
}

const EMPTY_PLAN: Omit<Plan, '_id'> = {
  name: '',
  slug: '',
  price: 0,
  yearlyPrice: 0,
  features: [],
  limits: { aiMessages: 10, photoStorage: 100, squadSize: 5 },
  isActive: true,
}

function centsToDisplay(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`
}

function PlanForm({
  plan,
  onChange,
}: {
  plan: Omit<Plan, '_id'>
  onChange: (p: Omit<Plan, '_id'>) => void
}) {
  const [tagInput, setTagInput] = useState('')

  function addFeature() {
    const trimmed = tagInput.trim()
    if (!trimmed || plan.features.includes(trimmed)) return
    onChange({ ...plan, features: [...plan.features, trimmed] })
    setTagInput('')
  }

  function removeFeature(f: string) {
    onChange({ ...plan, features: plan.features.filter((x) => x !== f) })
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFeature() }
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={plan.name}
            onChange={(e) => {
              const name = e.target.value
              onChange({ ...plan, name, slug: autoSlug(name) })
            }}
            placeholder="Pro"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={plan.slug}
            onChange={(e) => onChange({ ...plan, slug: e.target.value })}
            placeholder="pro"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Monthly Price (cents)</Label>
          <Input
            type="number"
            value={plan.price}
            onChange={(e) => onChange({ ...plan, price: Number(e.target.value) })}
            min={0}
          />
          <p className="text-xs text-muted-foreground">{centsToDisplay(plan.price)}/mo</p>
        </div>
        <div className="space-y-1.5">
          <Label>Yearly Price (cents)</Label>
          <Input
            type="number"
            value={plan.yearlyPrice}
            onChange={(e) => onChange({ ...plan, yearlyPrice: Number(e.target.value) })}
            min={0}
          />
          <p className="text-xs text-muted-foreground">{centsToDisplay(plan.yearlyPrice)}/yr</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Features</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type feature, press Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addFeature}>Add</Button>
        </div>
        {plan.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {plan.features.map((f) => (
              <span
                key={f}
                className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
              >
                {f}
                <button onClick={() => removeFeature(f)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Limits</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">AI msgs/day (-1 = ∞)</Label>
            <Input
              type="number"
              value={plan.limits.aiMessages}
              onChange={(e) => onChange({ ...plan, limits: { ...plan.limits, aiMessages: Number(e.target.value) } })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Photo MB (-1 = ∞)</Label>
            <Input
              type="number"
              value={plan.limits.photoStorage}
              onChange={(e) => onChange({ ...plan, limits: { ...plan.limits, photoStorage: Number(e.target.value) } })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Squad size (-1 = ∞)</Label>
            <Input
              type="number"
              value={plan.limits.squadSize}
              onChange={(e) => onChange({ ...plan, limits: { ...plan.limits, squadSize: Number(e.target.value) } })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label>Active</Label>
        <Switch
          checked={plan.isActive}
          onCheckedChange={(v) => onChange({ ...plan, isActive: v })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Stripe Price ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          value={(plan as Partial<Plan>).stripePriceId ?? ''}
          onChange={(e) => onChange({ ...plan, stripePriceId: e.target.value })}
          placeholder="price_xxxx"
        />
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [draft, setDraft] = useState<Omit<Plan, '_id'>>(EMPTY_PLAN)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchPlans() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/plans')
      const data = await res.json()
      setPlans(data.plans ?? [])
    } catch {
      toast.error('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  function openNew() {
    setEditTarget(null)
    setDraft(EMPTY_PLAN)
    setModalOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditTarget(plan)
    const { _id, ...rest } = plan
    void _id
    setDraft(rest)
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editTarget ? `/api/admin/plans/${editTarget._id}` : '/api/admin/plans'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editTarget ? 'Plan updated' : 'Plan created')
      setModalOpen(false)
      fetchPlans()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      })
      if (!res.ok) throw new Error('Update failed')
      setPlans((prev) => prev.map((p) => p._id === plan._id ? { ...p, isActive: !p.isActive } : p))
    } catch {
      toast.error('Failed to update plan')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/plans/${deleteTarget._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Plan deleted')
      setDeleteTarget(null)
      fetchPlans()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage subscription tiers.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <p className="text-sm">No plans yet.</p>
          <Button variant="outline" size="sm" onClick={openNew}>Create your first plan</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_80px_80px_80px_100px] gap-4 px-5 py-3 bg-muted text-xs text-muted-foreground font-medium uppercase tracking-wide">
            <span>Plan</span>
            <span>Monthly</span>
            <span>Yearly</span>
            <span>Features</span>
            <span>Active</span>
            <span>Actions</span>
          </div>

          {plans.map((plan, i) => (
            <div
              key={plan._id}
              className={`grid grid-cols-[1fr_100px_100px_80px_80px_80px_100px] gap-4 px-5 py-4 items-center text-sm ${i > 0 ? 'border-t' : ''}`}
            >
              <div>
                <p className="font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{plan.slug}</p>
              </div>
              <span>{centsToDisplay(plan.price)}</span>
              <span>{centsToDisplay(plan.yearlyPrice)}</span>
              <span>{plan.features.length}</span>
              <Switch checked={plan.isActive} onCheckedChange={() => handleToggleActive(plan)} />
              <div className="flex items-center gap-1 col-span-2">
                <button onClick={() => openEdit(plan)} className="p-1.5 rounded hover:bg-muted" title="Edit">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeleteTarget(plan)} className="p-1.5 rounded hover:bg-red-50" title="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan features preview cards */}
      {plans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Plan Features</h2>
          <div className="grid grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan._id} className="border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">{plan.name}</p>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-2xl font-bold mb-1">{centsToDisplay(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                  <p>AI: {plan.limits.aiMessages === -1 ? 'Unlimited' : `${plan.limits.aiMessages}/day`}</p>
                  <p>Photos: {plan.limits.photoStorage === -1 ? 'Unlimited' : `${plan.limits.photoStorage} MB`}</p>
                  <p>Squad: {plan.limits.squadSize === -1 ? 'Unlimited' : `${plan.limits.squadSize} members`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Plan' : 'New Plan'}</DialogTitle>
          </DialogHeader>
          <PlanForm plan={draft} onChange={setDraft} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            Users on this plan will lose their plan assignment.
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
