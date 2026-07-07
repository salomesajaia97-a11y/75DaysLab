'use client'
import { motion } from 'framer-motion'
import { MacroBar } from './MacroBar'
import { useLanguage } from '@/lib/i18n'
import type { MacroTargets } from '@/types'

interface MacroDashboardProps {
  targets: MacroTargets
  consumed: MacroTargets
}

const R = 58
const CX = 80
const CY = 80
const CIRC = 2 * Math.PI * R
const GAP = 80
const ARC = (360 - GAP) / 360 * CIRC
const ROTATE = 90 + GAP / 2

export function MacroDashboard({ targets, consumed }: MacroDashboardProps) {
  const { t } = useLanguage()
  const calPct = Math.min(consumed.calories / targets.calories, 1)
  const remaining = Math.max(targets.calories - consumed.calories, 0)
  const dashOffset = ARC - calPct * ARC

  return (
    <div
      className="flex items-center gap-8 rounded-2xl p-6"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Ring left */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="relative">
          <svg width="172" height="172" viewBox="0 0 160 160">
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
              style={{ transform: `rotate(${ROTATE}deg)`, transformOrigin: `${CX}px ${CY}px` }}
            />
            <motion.circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${CIRC}`}
              initial={{ strokeDashoffset: ARC }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.1, ease: [0.34, 1.05, 0.64, 1] }}
              style={{ transform: `rotate(${ROTATE}deg)`, transformOrigin: `${CX}px ${CY}px` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span
              className="text-5xl font-bold leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {consumed.calories}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {t('nutrition.of_kcal', { n: targets.calories.toLocaleString('en-US') })}
            </span>
          </div>
        </div>
        <p
          className="text-xs font-semibold tracking-widest uppercase mt-1"
          style={{ color: remaining > 0 ? '#7a9e7e' : '#c07c5e', letterSpacing: '0.12em' }}
        >
          {remaining > 0 ? t('nutrition.to_go', { n: remaining.toLocaleString('en-US') }) : t('nutrition.goal_reached')}
        </p>
      </div>

      {/* Macro bars right */}
      <div className="flex-1 space-y-5">
        <MacroBar label={t('nutrition.macro_protein')} consumed={consumed.proteinG} target={targets.proteinG} unit="g" accent="#c07c5e" delay={0} />
        <MacroBar label={t('nutrition.macro_carbs')}   consumed={consumed.carbsG}   target={targets.carbsG}   unit="g" accent="#c5a55a" delay={0.08} />
        <MacroBar label={t('nutrition.macro_fat')}     consumed={consumed.fatG}     target={targets.fatG}     unit="g" accent="#7a9e7e" delay={0.16} />
      </div>
    </div>
  )
}
