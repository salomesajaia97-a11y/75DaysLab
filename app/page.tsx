import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LandingExperience } from '@/components/landing/LandingExperience'

export default async function Home() {
  let session = null
  try { session = await auth() } catch {}
  if (session?.user?.id) redirect('/dashboard')

  return <LandingExperience />
}
