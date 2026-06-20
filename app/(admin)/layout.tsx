import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ImageIcon,
  Trophy,
  ClipboardList,
  BarChart2,
  Flag,
  ArrowLeft,
  Palette,
  FileText,
  Database,
  CreditCard,
} from 'lucide-react'
import { AdminNavItem } from './AdminNavItem'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/theme', label: 'Theme', icon: Palette },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/collections', label: 'Collections', icon: Database },
  { href: '/admin/pricing', label: 'Pricing', icon: CreditCard },
  { href: '/admin/photos', label: 'Photos', icon: ImageIcon },
  { href: '/admin/challenges', label: 'Challenges', icon: Trophy },
  { href: '/admin/logs', label: 'Daily Logs', icon: ClipboardList },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/flags', label: 'Feature Flags', icon: Flag },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session = null
  try { session = await auth() } catch { redirect('/login') }

  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex bg-[#f4f4f5]">
      {/* Sidebar */}
      <aside className="admin-sidebar fixed left-0 top-0 h-full w-[240px] flex flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            O
          </div>
          <span className="font-semibold text-sm" style={{ color: '#ffffff' }}>Admin Console</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <AdminNavItem
              key={href}
              href={href}
              label={label}
              icon={<Icon className="h-4 w-4 shrink-0" />}
            />
          ))}
        </nav>

        {/* Back to app */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Back to app</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[240px] p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
