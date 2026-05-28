'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/water', label: 'Water', icon: Droplets },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
  { href: '/cycle', label: 'Cycle', icon: Calendar },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/squads', label: 'Squads', icon: Users },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-16 md:w-56 bg-card border-r border-border flex flex-col pt-6 gap-1 z-40">
      <div className="px-4 mb-6 hidden md:block">
        <span className="font-bold text-xl tracking-tight">75DaysLab</span>
      </div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="hidden md:block">{label}</span>
        </Link>
      ))}
      <div className="mt-auto mb-4">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent w-full"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden md:block">Log out</span>
        </button>
      </div>
    </aside>
  )
}
