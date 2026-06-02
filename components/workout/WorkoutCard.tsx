'use client'
import { useEffect, useRef } from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkoutTracker } from '@/hooks/useWorkoutTracker'
import { WorkoutSession } from './WorkoutSession'

const WEATHER_MOCK = {
  icon: '☀️',
  message: 'Perfect sunny weather! Your outdoor session is highly recommended today.',
}

interface WorkoutCardProps {
  onBothComplete(): void
}

export function WorkoutCard({ onBothComplete }: WorkoutCardProps) {
  const {
    state,
    toggleTimer,
    resetTimer,
    confirmDone,
    dismissConfirm,
    toggleVideos,
    manualToggleDone,
    bothDone,
  } = useWorkoutTracker()

  const firedRef = useRef(false)

  useEffect(() => {
    if (bothDone && !firedRef.current) {
      firedRef.current = true
      onBothComplete()
    }
    if (!bothDone) firedRef.current = false
  }, [bothDone, onBothComplete])

  const doneCount = (state.indoor.done ? 1 : 0) + (state.outdoor.done ? 1 : 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Workouts</CardTitle>
          <Badge
            variant="outline"
            className={doneCount === 2 ? 'border-green-500/30 bg-green-500/10 text-green-600' : ''}
          >
            {doneCount} / 2 done
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weather mock banner */}
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <span className="text-base shrink-0 mt-0.5">{WEATHER_MOCK.icon}</span>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{WEATHER_MOCK.message}</p>
        </div>

        {/* Both done celebration */}
        {bothDone && (
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            <Flame className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Both workouts complete!</span>
          </div>
        )}

        <WorkoutSession
          type="indoor"
          session={state.indoor}
          onToggleTimer={() => toggleTimer('indoor')}
          onResetTimer={() => resetTimer('indoor')}
          onConfirmDone={() => confirmDone('indoor')}
          onDismissConfirm={() => dismissConfirm('indoor')}
          onToggleVideos={() => toggleVideos('indoor')}
          onManualToggle={() => manualToggleDone('indoor')}
        />
        <WorkoutSession
          type="outdoor"
          session={state.outdoor}
          onToggleTimer={() => toggleTimer('outdoor')}
          onResetTimer={() => resetTimer('outdoor')}
          onConfirmDone={() => confirmDone('outdoor')}
          onDismissConfirm={() => dismissConfirm('outdoor')}
          onToggleVideos={() => toggleVideos('outdoor')}
          onManualToggle={() => manualToggleDone('outdoor')}
        />
      </CardContent>
    </Card>
  )
}
