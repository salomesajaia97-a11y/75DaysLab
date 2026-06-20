'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  onboardingComplete: boolean
  createdAt: string
  planId?: string
}

interface Plan {
  _id: string
  name: string
  slug: string
}

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    fetchUsers()
    fetch('/api/admin/plans').then((r) => r.json()).then((d) => setPlans(d.plans ?? []))
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handlePlanChange(userId: string, planId: string | null) {
    if (planId === null) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planId === 'none' ? null : planId }),
      })
      if (!res.ok) throw new Error('Update failed')
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, planId: planId === 'none' ? undefined : planId } : u))
      )
      toast.success('Plan updated')
    } catch {
      toast.error('Failed to update plan')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setTotal((prev) => prev - 1)
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted-foreground)' }}>
        Loading users...
      </div>
    )
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>
        <Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>
      </div>
    )
  }

  return (
    <>
      {/* Stats */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        <Users className="h-4 w-4" />
        <span>{total} user{total !== 1 ? 's' : ''} total</span>
        <span>·</span>
        <span>{users.filter((u) => u.role === 'admin').length} admin{users.filter((u) => u.role === 'admin').length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Header */}
        <div
          className="grid grid-cols-[1fr_1fr_80px_120px_100px_48px] gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wide"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          <span>Plan</span>
          <span>Joined</span>
          <span />
        </div>

        {/* Rows */}
        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No users found
          </div>
        ) : (
          users.map((user, i) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_1fr_80px_120px_100px_48px] gap-4 px-4 py-3 items-center text-sm"
              style={{
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                background: 'var(--background)',
              }}
            >
              {/* Username + onboarding */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  {user.username[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {user.username}
                  </p>
                  {!user.onboardingComplete && (
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      not onboarded
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <span className="truncate" style={{ color: 'var(--muted-foreground)' }}>
                {user.email}
              </span>

              {/* Role badge */}
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>

              {/* Plan */}
              <Select
                value={user.planId ?? 'none'}
                onValueChange={(v) => handlePlanChange(user.id, v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="No plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Joined date */}
              <span style={{ color: 'var(--muted-foreground)' }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>

              {/* Delete */}
              <button
                onClick={() => setDeleteTarget(user)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Delete user"
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--destructive)' }} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{deleteTarget?.username}</strong> and all their data?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={isDeleting} />
              }
            >
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
