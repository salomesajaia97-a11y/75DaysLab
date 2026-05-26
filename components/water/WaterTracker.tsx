'use client'
import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWaterTracker } from '@/hooks/useWaterTracker'

interface WaterTrackerProps {
  consumedMl: number
  goalMl: number
}

const QUICK_ADD = [200, 300, 500]

export function WaterTracker({ consumedMl, goalMl }: WaterTrackerProps) {
  const { consumed: currentMl, percent, remainingMl, addWater } = useWaterTracker({ consumedMl, goalMl })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-24 h-40 rounded-b-3xl rounded-t-lg border-2 border-border overflow-hidden bg-muted">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-blue-500/70"
          initial={{ height: '0%' }}
          animate={{ height: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <Droplets className="h-5 w-5 text-white drop-shadow" />
          <span className="text-sm font-bold text-white drop-shadow">{Math.round(percent)}%</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold">{currentMl} <span className="text-sm text-muted-foreground">ml</span></p>
        <p className="text-sm text-muted-foreground">of {goalMl} ml goal</p>
        {remainingMl > 0 && (
          <p className="text-xs text-blue-400 mt-1">{remainingMl} ml remaining</p>
        )}
      </div>

      <div className="flex gap-2">
        {QUICK_ADD.map(ml => (
          <Button key={ml} size="sm" variant="outline" onClick={() => addWater(ml)}>
            +{ml}ml
          </Button>
        ))}
      </div>
    </div>
  )
}
