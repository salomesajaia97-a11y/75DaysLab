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
        <span className="text-sm font-medium tracking-wide" style={{ color: accent }}>{label}</span>
        <div className="text-sm tabular-nums">
          <span className="font-bold">{consumed}</span>
          <span style={{ color: 'var(--muted-foreground)' }}>
            &thinsp;/&thinsp;{target}&thinsp;{unit}
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: accent, opacity: 0.8 }}
          initial={{ width: '0%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  )
}
