import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces, Nunito } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
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

export const metadata: Metadata = {
  title: '75DaysLab',
  description: 'Your customizable 75-day challenge tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
