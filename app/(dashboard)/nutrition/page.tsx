'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MacroDashboard } from '@/components/nutrition/MacroDashboard'
import { FoodLogger } from '@/components/nutrition/FoodLogger'
import { Badge } from '@/components/ui/badge'
import type { FoodEntry, MacroTargets } from '@/types'

const MOCK_TARGETS: MacroTargets = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 }

export default function NutritionPage() {
  const [consumed, setConsumed] = useState<MacroTargets>({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])

  function handleLogged(entry: FoodEntry) {
    setFoodLog(prev => [entry, ...prev])
    setConsumed(prev => ({
      calories: prev.calories + entry.calories,
      proteinG: prev.proteinG + entry.proteinG,
      carbsG: prev.carbsG + entry.carbsG,
      fatG: prev.fatG + entry.fatG,
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Nutrition</h1>
      <Card>
        <CardHeader><CardTitle>Daily Macros</CardTitle></CardHeader>
        <CardContent>
          <MacroDashboard targets={MOCK_TARGETS} consumed={consumed} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Log a Meal</CardTitle></CardHeader>
        <CardContent>
          <FoodLogger onLogged={handleLogged} />
        </CardContent>
      </Card>
      {foodLog.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Today&apos;s Food Log</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {foodLog.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">P: {entry.proteinG}g · C: {entry.carbsG}g · F: {entry.fatG}g</p>
                </div>
                <Badge variant="outline">{entry.calories} kcal</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
