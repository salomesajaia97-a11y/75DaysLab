'use client'
import { motion } from 'framer-motion'
import { MacroBar } from './MacroBar'
import type { MacroTargets } from '@/types'

interface MacroDashboardProps {
  targets: MacroTargets
  consumed: MacroTargets
}

const R = 52
const CX = 70
const CY = 70
const CIRC = 2 * Math.PI * R
const GAP = 70
const ARC = (360 - GAP) / 360 * CIRC
const ROTATE = 90 + GAP / 2

export function MacroDashboard({ targets, consumed }: MacroDashboardProps) {
  const calPct = Math.min(consumed.calories / targets.calories, 1)
  const remaining = Math.max(targets.calories - consumed.calories, 0)
  const dashOffset = ARC - calPct * ARC

  return (
    <div className="space-y-6">
      {/* Calorie ring */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 140 140">
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
              style={{ transform: `rotate(${ROTATE}deg)`, transformOrigin: `${CX}px ${CY}px` }}
            />
            {/* Progress */}
            <motion.circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
              initial={{ strokeDashoffset: ARC }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.1, ease: [0.34, 1.05, 0.64, 1] }}
              style={{ transform: `rotate(${ROTATE}deg)`, transformOrigin: `${CX}px ${CY}px` }}
            />
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span
              className="text-4xl font-bold leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {consumed.calories}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              of {targets.calories} kcal
            </span>
          </div>
        </div>

        <p
          className="text-xs font-semibold tracking-widest uppercase mt-1"
          style={{ color: remaining > 0 ? '#7a9e7e' : '#c07c5e', letterSpacing: '0.12em' }}
        >
          {remaining > 0 ? `${remaining} kcal to go` : 'Goal reached'}
        </p>
      </div>

      {/* Macro bars */}
      <div className="space-y-4 pt-2">
        <MacroBar label="Protein" consumed={consumed.proteinG} target={targets.proteinG} unit="g" accent="#c07c5e" delay={0} />
        <MacroBar label="Carbs"   consumed={consumed.carbsG}   target={targets.carbsG}   unit="g" accent="#c5a55a" delay={0.08} />
        <MacroBar label="Fat"     consumed={consumed.fatG}     target={targets.fatG}     unit="g" accent="#7a9e7e" delay={0.16} />
      </div>
    </div>
  )
}
