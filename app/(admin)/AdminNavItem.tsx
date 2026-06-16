'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNavItem({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
      style={
        isActive
          ? { background: '#f97316', color: '#ffffff' }
          : { color: 'rgba(255,255,255,0.7)' }
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
