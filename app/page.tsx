import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'

export default async function Home() {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">75DaysLab</h1>
          <p className="text-muted-foreground text-lg">Build the discipline that changes everything.</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/register"
            className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold h-12 px-6 text-base hover:opacity-90 transition-opacity"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center rounded-lg border border-border text-foreground font-semibold h-12 px-6 text-base hover:bg-accent transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
