'use client'

import { useState } from 'react'
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { performLogout } from '@/lib/auth-client'

export default function SetupAdminPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'already'>('idle')
  const [message, setMessage] = useState('')

  async function grantAdmin() {
    setStatus('loading')
    try {
      const res = await fetch('/api/setup-admin', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus('done')
        setMessage(`Admin granted to ${data.email}. Sign out and back in to see the Admin panel.`)
      } else if (res.status === 403) {
        setStatus('already')
        setMessage('An admin already exists. Contact your admin for access.')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Make sure you are logged in.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 flex flex-col items-center gap-6 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--muted)' }}
      >
        <Shield className="h-8 w-8" style={{ color: 'var(--foreground)' }} />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Admin Setup</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
          Click the button below to grant your account admin access.<br />
          This only works if no admin exists yet.
        </p>
      </div>

      {status === 'idle' || status === 'loading' ? (
        <button
          onClick={grantAdmin}
          disabled={status === 'loading'}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-opacity"
          style={{
            background: 'var(--foreground)',
            color: 'var(--background)',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          <Shield className="h-4 w-4" />
          {status === 'loading' ? 'Granting…' : 'Grant Admin Access'}
        </button>
      ) : status === 'done' ? (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>{message}</p>
          <button
            onClick={() => performLogout()}
            className="px-6 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            Sign out now
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-yellow-500" />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{message}</p>
        </div>
      )}
    </div>
  )
}
