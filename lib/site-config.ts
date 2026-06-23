import { unstable_cache } from 'next/cache'
import { connectDB } from '@/lib/mongoose'
import { SiteConfig, ISiteConfig } from '@/models/SiteConfig'

export const DEFAULT_THEME: ISiteConfig['theme'] = {
  primaryColor: '#2d3142',
  accentColor: '#ede9e3',
  backgroundColor: '#f5f3ef',
  textColor: '#2d3142',
  fontFamily: 'fraunces',
  fontSize: 'md',
  borderRadius: 'md',
}

const FONT_MAP: Record<string, string> = {
  jakarta:  'var(--font-jakarta), sans-serif',
  fraunces: 'var(--font-fraunces), Georgia, serif',
  nunito:   'var(--font-caveat), sans-serif',
  georgian: 'var(--font-noto-georgian), sans-serif',
}

const FONT_SIZE_MAP: Record<string, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
}

const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  sm:   '0.25rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  full: '9999px',
}

async function _fetchSiteConfig(): Promise<ISiteConfig['theme']> {
  try {
    await connectDB()
    const doc = await SiteConfig.findOne({}).lean()
    if (!doc) return DEFAULT_THEME
    return doc.theme ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export const getSiteConfig = unstable_cache(
  _fetchSiteConfig,
  ['site-config'],
  { revalidate: 60, tags: ['site-config'] }
)

export function buildThemeCssVars(theme: ISiteConfig['theme']): Record<string, string> {
  const radius = RADIUS_MAP[theme.borderRadius] ?? '0.5rem'
  const font = FONT_MAP[theme.fontFamily] ?? FONT_MAP.fraunces
  const fontSize = FONT_SIZE_MAP[theme.fontSize] ?? '16px'

  return {
    '--background': theme.backgroundColor,
    '--foreground': theme.textColor,
    '--primary': theme.primaryColor,
    '--primary-foreground': '#ffffff',
    '--accent': theme.accentColor,
    '--accent-foreground': theme.textColor,
    '--radius': radius,
    '--theme-font': font,
    '--theme-size': fontSize,
  }
}

/** @deprecated use buildThemeCssVars */
export function buildThemeStyle(theme: ISiteConfig['theme']): string {
  const vars = buildThemeCssVars(theme)
  return `:root{${Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';')}}`
}
