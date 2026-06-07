import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Shield, LayoutDashboard } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session = null
  try { session = await auth() } catch { redirect('/login') }

  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex">
      <aside className="fixed left-0 top-0 h-full w-16 md:w-56 flex flex-col pt-7 gap-1 z-40 border-r" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
        <div className="px-5 mb-7 hidden md:flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
          <span
            className="font-bold text-xl tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
          >
            Admin
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-0.5 px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="hidden md:block">Back to Dashboard</span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 ml-16 md:ml-56 p-6">
        {children}
      </main>
    </div>
  )
}
