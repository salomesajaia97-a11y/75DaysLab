'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Locale } from '@/lib/i18n'
import { LanguageContext } from '@/lib/i18n'
import en from '@/locales/en.json'
import ge from '@/locales/ge.json'

const translations: Record<Locale, Record<string, string>> = { en, ge }

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = sessionStorage.getItem('locale') as Locale | null
    if (saved === 'en' || saved === 'ge') {
      setLocaleState(saved)
      document.documentElement.lang = saved
      document.documentElement.classList.toggle('lang-ge', saved === 'ge')
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    sessionStorage.setItem('locale', l)
    document.documentElement.lang = l
    document.documentElement.classList.toggle('lang-ge', l === 'ge')
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const str = translations[locale][key] ?? translations['en'][key] ?? key
    return interpolate(str, vars)
  }, [locale])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
