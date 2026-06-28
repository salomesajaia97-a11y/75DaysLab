'use client'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useWaterTracker } from '@/hooks/useWaterTracker'

interface WaterTrackerProps {
  consumedMl: number
  goalMl: number
  gender?: 'male' | 'female' | 'other' | null
}

const QUICK_ADD = [200, 300, 500]

// Glass shape: slight taper — wider at top, narrow at bottom
// ViewBox 0 0 100 180
const GLASS_PATH = 'M 8,4 L 92,4 L 82,172 L 18,172 Z'
const GLASS_CLIP = 'M 9,6 L 91,6 L 81,170 L 19,170 Z'

export function WaterTracker({ consumedMl, goalMl, gender }: WaterTrackerProps) {
  const { consumed: currentMl, percent, remainingMl, addWater } = useWaterTracker({ consumedMl, goalMl })

  const FILL_TOP = 10
  const FILL_BOT = 168
  const waterY = FILL_BOT - ((FILL_BOT - FILL_TOP) * Math.min(percent, 100)) / 100

  return (
    <div className="flex flex-col items-center gap-6">

      <div style={{ filter: 'drop-shadow(0 8px 24px rgba(14,165,233,0.28))' }}>
        <svg width="160" height="288" viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wgg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22d3ee" />
              <stop offset="55%"  stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="wgs" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="white" stopOpacity="0.3" />
              <stop offset="45%"  stopColor="white" stopOpacity="0.07" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <clipPath id="wgc">
              <path d={GLASS_CLIP} />
            </clipPath>
            <style>{`
              @keyframes wwg {
                from { transform: translateX(0); }
                to   { transform: translateX(-80px); }
              }
            `}</style>
          </defs>

          {/* Glass outline */}
          <path d={GLASS_PATH} fill="none"
            stroke="rgba(148,163,184,0.55)" strokeWidth="2"
            strokeLinejoin="round" />

          {/* Water fill clipped to glass interior */}
          <g clipPath="url(#wgc)">
            {/* Blue fill */}
            <rect x="0" y="0" width="100" height="180" fill="url(#wgg)" />

            {/* Descending mask — hides water above line */}
            <motion.rect
              x="0" width="100"
              initial={{ height: 180 }}
              animate={{ height: waterY }}
              transition={{ duration: 1.0, ease: [0.34, 1.1, 0.64, 1] }}
              fill="var(--background)"
            />

            {/* Wave at surface */}
            <motion.g
              initial={{ y: 175 }}
              animate={{ y: waterY - 6 }}
              transition={{ duration: 1.0, ease: [0.34, 1.1, 0.64, 1] }}
            >
              <g style={{ animation: 'wwg 2.6s linear infinite' }}>
                <path
                  d="M-80 6 Q-60 0 -40 6 Q-20 12 0 6 Q20 0 40 6 Q60 12 80 6 Q100 0 120 6 Q140 12 160 6 L160 40 L-80 40 Z"
                  fill="url(#wgg)"
                />
              </g>
            </motion.g>

            {/* Shimmer */}
            <motion.rect
              x="2" width="18"
              animate={{ y: waterY }}
              initial={{ y: 180 }}
              transition={{ duration: 1.0, ease: [0.34, 1.1, 0.64, 1] }}
              height="180" fill="url(#wgs)"
            />
          </g>

          {/* Percent label */}
          <text x="50" y="100" textAnchor="middle" fontSize="16" fontWeight="700"
            fill="white" opacity="0.92"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            {Math.round(percent)}%
          </text>
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-3xl font-bold">
          {(currentMl / 1000).toFixed(2)}
          <span className="text-base font-normal ml-1" style={{ color: 'var(--muted-foreground)' }}>L</span>
        </p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>of {(goalMl / 1000).toFixed(2)} L goal</p>
        {remainingMl > 0
          ? <p className="text-xs font-medium text-sky-500">{(remainingMl / 1000).toFixed(2)} L remaining</p>
          : <p className="text-xs font-semibold text-green-500">Goal reached! 🎉</p>
        }
      </div>

      <div className="flex gap-2">
        {QUICK_ADD.map(ml => (
          <Button key={ml} size="sm" variant="outline" onClick={() => addWater(ml)}
            className="rounded-xl font-medium"
            style={{ borderColor: 'rgba(14,165,233,0.3)' }}>
            +{(ml / 1000).toFixed(1)}L
          </Button>
        ))}
      </div>
    </div>
  )
}
