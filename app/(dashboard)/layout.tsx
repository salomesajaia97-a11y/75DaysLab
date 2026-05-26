import { DashboardSidebar } from '@/components/shared/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 ml-16 md:ml-56 p-6">
        {children}
      </main>
    </div>
  )
}
