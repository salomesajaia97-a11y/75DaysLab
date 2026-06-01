'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/water',     label: 'Water',     icon: Droplets },
  { href: '/journal',   label: 'Journal',   icon: BookOpen },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
  { href: '/cycle',     label: 'Cycle',     icon: Calendar },
  { href: '/photos',    label: 'Photos',    icon: Camera },
  { href: '/squads',    label: 'Squads',    icon: Users },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-16 md:w-60 flex flex-col pt-7 gap-1 z-40">
      <div className="px-5 mb-7 hidden md:block">
        <span
          className="font-bold text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
        >
          75DaysLab
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-0.5 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
                  : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="px-2 pb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <ThemeToggle />
          <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Theme
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden md:block">Log out</span>
        </button>
      </div>
    </aside>
  )
}
