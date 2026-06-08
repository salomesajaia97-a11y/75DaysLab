import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { DashboardSidebar } from '@/components/shared/DashboardSidebar'
import { LabAIWidget } from '@/components/ai/LabAIWidget'
import mongoose from 'mongoose'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = null
  try { session = await auth() } catch { redirect('/login') }

  if (!session?.user?.id) redirect('/login')

  if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
    await signOut({ redirectTo: '/login' })
  }

  await connectDB()
  const user = await User.findById(session.user.id).select('onboardingComplete')

  if (!user?.onboardingComplete) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 ml-16 md:ml-56 p-6">
        {children}
      </main>
      <LabAIWidget />
    </div>
  )
}
