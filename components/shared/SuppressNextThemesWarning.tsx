'use client'

if (typeof window !== 'undefined') {
  const orig = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('script tag')) return
    orig(...args)
  }
}

export function SuppressNextThemesWarning() {
  return null
}
