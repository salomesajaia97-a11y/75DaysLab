import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces, Nunito, Noto_Sans_Georgian } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { SuppressNextThemesWarning } from '@/components/shared/SuppressNextThemesWarning'
import { LanguageProvider } from '@/components/shared/LanguageProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getSiteConfig, buildThemeStyle } from '@/lib/site-config'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-noto-georgian',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '75DaysLab',
  description: 'Your customizable 75-day challenge tracker',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getSiteConfig()
  const themeStyle = buildThemeStyle(theme)

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} ${nunito.variable} ${notoGeorgian.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <SuppressNextThemesWarning />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <SessionProvider>{children}</SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
