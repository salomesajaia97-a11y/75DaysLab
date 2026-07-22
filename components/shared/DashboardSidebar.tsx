'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut, Dumbbell, Shield, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { performLogout } from '@/lib/auth-client'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

export function DashboardSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const links = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, color: '#ef4f2b' },
    { href: '/fitness',   labelKey: 'nav.fitness',   icon: Dumbbell,        color: '#20a06b' },
    { href: '/water',     labelKey: 'nav.water',     icon: Droplets,        color: '#2f72d6' },
    { href: '/journal',   labelKey: 'nav.journal',   icon: BookOpen,        color: '#7c5cd6' },
    { href: '/nutrition', labelKey: 'nav.nutrition', icon: Utensils,        color: '#e8930f' },
    { href: '/cycle',     labelKey: 'nav.cycle',     icon: Calendar,        color: '#e14682' },
    { href: '/photos',    labelKey: 'nav.photos',    icon: Camera,          color: '#4f60d6' },
    { href: '/squads',    labelKey: 'nav.squads',    icon: Users,           color: '#1f9c8f' },
    { href: '/ai',        labelKey: 'nav.ai',        icon: Bot,             color: '#d6562b' },
  ]

  const adminLink = { href: '/admin', label: 'Admin', icon: Shield, color: '#3b6fd4' }

  return (
    <aside className="fixed left-0 top-0 h-full w-16 md:w-60 flex flex-col pt-7 gap-1 z-40">
      <div className="px-5 mb-7 hidden md:block">
        <Link href="/dashboard">
          <span
            className="font-bold text-xl tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
          >
            75DaysLab
          </span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col gap-0.5 px-2">
        {links.map(({ href, labelKey, icon: Icon, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{ '--nav': color } as React.CSSProperties}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
                  : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0 transition-all duration-200 ease-out group-hover:scale-[1.35] group-hover:-rotate-6 group-hover:text-[var(--nav)] group-hover:drop-shadow-[0_0_6px_var(--nav)]" />
              <span className="hidden md:block">{t(labelKey)}</span>
            </Link>
          )
        })}
        {isAdmin && (
          <>
            <div className="my-1 mx-3 h-px bg-[#e5e4e0]" />
            <Link
              href={adminLink.href}
              style={{ '--nav': adminLink.color } as React.CSSProperties}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                pathname === adminLink.href || pathname.startsWith(adminLink.href + '/')
                  ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
                  : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
              )}
            >
              <adminLink.icon className="h-4 w-4 shrink-0 transition-all duration-200 ease-out group-hover:scale-[1.35] group-hover:-rotate-6 group-hover:text-[var(--nav)] group-hover:drop-shadow-[0_0_6px_var(--nav)]" />
              <span className="hidden md:block">{adminLink.label}</span>
            </Link>
          </>
        )}
      </div>

      <div className="px-2 pb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <ThemeToggle />
          <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            {t('nav.theme')}
          </span>
        </div>
        <div className="flex items-center gap-2 px-1">
          <LanguageSwitcher />
        </div>
        <button
          onClick={() => performLogout()}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--muted-foreground)', '--nav': '#e05252' } as React.CSSProperties}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-all duration-200 ease-out group-hover:scale-[1.35] group-hover:-rotate-6 group-hover:text-[var(--nav)] group-hover:drop-shadow-[0_0_6px_var(--nav)]" />
          <span className="hidden md:block">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
