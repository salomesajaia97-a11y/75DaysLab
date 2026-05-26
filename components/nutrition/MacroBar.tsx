'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MacroBarProps {
  label: string
  consumed: number
  target: number
  unit: string
  color: string
}

export function MacroBar({ label, consumed, target, unit, color }: MacroBarProps) {
  const percent = Math.min((consumed / target) * 100, 100)
  const remaining = Math.max(target - consumed, 0)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{consumed} / {target}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: '0%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{remaining}{unit} remaining</p>
    </div>
  )
}
