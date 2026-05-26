'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'

interface StreakCounterProps {
  day: number
  totalDays: number
}

export function StreakCounter({ day, totalDays }: StreakCounterProps) {
  const percent = Math.min((day / totalDays) * 100, 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={339.3}
            initial={{ strokeDashoffset: 339.3 }}
            animate={{ strokeDashoffset: 339.3 - (339.3 * percent) / 100 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame className="h-5 w-5 text-orange-400" />
          <AnimatePresence mode="wait">
            <motion.span
              key={day}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-3xl font-bold"
            >
              {day}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-muted-foreground">of {totalDays}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">Day Streak</span>
    </div>
  )
}
