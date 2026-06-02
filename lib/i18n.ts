import { createContext, useContext } from 'react'

export type Locale = 'en' | 'ge'

export interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function useLanguage() {
  return useContext(LanguageContext)
}
