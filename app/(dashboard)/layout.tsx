import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { DashboardSidebar } from '@/components/shared/DashboardSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
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
    </div>
  )
}
