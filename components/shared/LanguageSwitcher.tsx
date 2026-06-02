'use client'
import { useLanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage()

  return (
    <div className={cn('flex gap-1', className)}>
      {(['en', 'ge'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-semibold uppercase transition-all duration-200',
            locale === l
              ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
              : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
