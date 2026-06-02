'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps as NextThemesProviderProps } from 'next-themes'

interface ThemeProviderProps extends Omit<NextThemesProviderProps, 'children'> {
  children: React.ReactNode
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}
