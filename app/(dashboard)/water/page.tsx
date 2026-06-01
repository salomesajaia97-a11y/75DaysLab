'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterTracker } from '@/components/water/WaterTracker'
import { getProfile } from '@/lib/storage'
import { calculateWaterGoal } from '@/lib/calculations'
import type { UserProfile } from '@/types'

export default function WaterPage() {
  const [goalMl, setGoalMl] = useState(2500)
  const [gender, setGender] = useState<UserProfile['gender'] | null>(null)

  useEffect(() => {
    const profile = getProfile()
    if (profile) {
      setGoalMl(calculateWaterGoal(profile.weightKg, profile.gender, profile.goal))
      setGender(profile.gender ?? null)
    }
  }, [])

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Hydration Tracker</h1>
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Water Intake</CardTitle>
          <p className="text-sm text-muted-foreground">Daily goal: {goalMl} ml — calculated from your profile</p>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <WaterTracker consumedMl={0} goalMl={goalMl} gender={gender} />
        </CardContent>
      </Card>
    </div>
  )
}
