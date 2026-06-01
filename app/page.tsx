import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export default async function Home() {
  let session = null
  try { session = await auth() } catch {}
  if (session?.user?.id) redirect('/dashboard')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background)' }}>

      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Soft ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(186,230,253,0.35) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(254,205,211,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '25%',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,252,231,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      <div className="relative text-center space-y-8 max-w-lg w-full">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.18em] uppercase"
            style={{ color: 'var(--muted-foreground)' }}>
            Your challenge awaits
          </p>
          <h1
            className="text-6xl font-light leading-tight"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
          >
            75 Days<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.01em' }}>of discipline.</em>
          </h1>
          <p className="text-base leading-relaxed max-w-sm mx-auto"
            style={{ color: 'var(--muted-foreground)' }}>
            Track your workouts, water, nutrition, and mindset — every single day.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/register" className="landing-btn-primary">
            Start your challenge
          </Link>
          <Link href="/login" className="landing-btn-ghost">
            Sign in
          </Link>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Join thousands building unbreakable habits.
        </p>
      </div>
    </main>
  )
}
