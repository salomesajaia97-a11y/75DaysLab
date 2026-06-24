'use client'
import { motion } from 'framer-motion'

interface Day { date: string; calories: number }
interface WeeklyChartProps {
  days: Day[]
  target: number
  selected: string
  onSelectDay: (date: string) => void
}

export function WeeklyChart({ days, target, selected, onSelectDay }: WeeklyChartProps) {
  const max = Math.max(target, ...days.map(d => d.calories), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {days.map((d, i) => {
        const pct = d.calories / max
        const over = d.calories > target && target > 0
        const isSel = d.date === selected
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelectDay(d.date)}
            className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(pct * 100, 3)}%` }}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.34, 1.05, 0.64, 1] }}
              className="w-full rounded-t-md"
              style={{
                background: over ? '#c07c5e' : 'var(--foreground)',
                opacity: isSel ? 1 : 0.45,
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: isSel ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
