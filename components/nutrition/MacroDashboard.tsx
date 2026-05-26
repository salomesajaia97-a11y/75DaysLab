import { MacroBar } from './MacroBar'
import type { MacroTargets } from '@/types'

interface MacroDashboardProps {
  targets: MacroTargets
  consumed: MacroTargets
}

export function MacroDashboard({ targets, consumed }: MacroDashboardProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-4xl font-bold">{consumed.calories}</p>
        <p className="text-muted-foreground">of {targets.calories} kcal</p>
        <p className="text-sm text-green-400 mt-1">{targets.calories - consumed.calories} kcal remaining</p>
      </div>
      <MacroBar label="Protein" consumed={consumed.proteinG} target={targets.proteinG} unit="g" color="bg-blue-500" />
      <MacroBar label="Carbs" consumed={consumed.carbsG} target={targets.carbsG} unit="g" color="bg-yellow-500" />
      <MacroBar label="Fat" consumed={consumed.fatG} target={targets.fatG} unit="g" color="bg-red-400" />
    </div>
  )
}
