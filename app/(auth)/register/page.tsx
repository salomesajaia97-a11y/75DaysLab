'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { useLanguage } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError(t('auth.register.error_short_password'))
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    let data: Record<string, string> = {}
    try { data = await res.json() } catch { /* empty body */ }
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? t('auth.register.error_failed'))
      return
    }
    router.push('/login?registered=1')
  }

  return (
    <AuthShell eyebrow="75 Days Lab" title={t('auth.register.title')} description={t('auth.register.description')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">{t('auth.register.username')}</Label>
          <Input id="username" placeholder="your_name" value={form.username}
            onChange={(e) => update('username', e.target.value)} required autoComplete="username" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.register.email')}</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={form.email}
            onChange={(e) => update('email', e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.register.password')}</Label>
          <Input id="password" type="password" placeholder="min. 8 characters" value={form.password}
            onChange={(e) => update('password', e.target.value)} required autoComplete="new-password" minLength={8} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full h-11 rounded-xl text-[0.95rem]" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('auth.register.submit')}
        </Button>
        <div className="auth-or">{t('auth.register.or')}</div>
        <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-[0.95rem]"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('auth.register.google')}
        </Button>
        <p className="auth-foot">
          {t('auth.register.has_account')}{' '}
          <Link href="/login" className="auth-link">{t('auth.register.sign_in')}</Link>
        </p>
      </form>
    </AuthShell>
  )
}
