'use client'
import { motion } from 'framer-motion'

interface MacroBarProps {
  label: string
  consumed: number
  target: number
  unit: string
  accent: string
  delay?: number
}

export function MacroBar({ label, consumed, target, unit, accent, delay = 0 }: MacroBarProps) {
  const percent = Math.min((consumed / target) * 100, 100)
  const remaining = Math.max(target - consumed, 0)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-sm font-medium tracking-wide">{label}</span>
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold" style={{ color: accent }}>{consumed}</span>
          <span style={{ color: 'var(--muted-foreground)' }}>
            &thinsp;/&thinsp;{target}{unit}
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: accent, opacity: 0.75 }}
          initial={{ width: '0%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay }}
        />
      </div>

      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {remaining}{unit} remaining
      </p>
    </div>
  )
}
