import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterTracker } from '@/components/water/WaterTracker'

export default function WaterPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Hydration Tracker</h1>
      <Card>
        <CardHeader><CardTitle>Today&apos;s Water Intake</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-6">
          <WaterTracker consumedMl={0} goalMl={2500} />
        </CardContent>
      </Card>
    </div>
  )
}
