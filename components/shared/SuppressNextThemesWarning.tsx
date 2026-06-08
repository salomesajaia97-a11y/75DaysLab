'use client'
import { useEffect } from 'react'

export function SuppressNextThemesWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const orig = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('script tag')) return
      orig(...args)
    }
    return () => { console.error = orig }
  }, [])
  return null
}
