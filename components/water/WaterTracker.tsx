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

// Body built from overlapping rounded shapes — guaranteed to look human
// ViewBox 0 0 100 310

function BodyDef({ id, female }: { id: string; female: boolean }) {
  return (
    <clipPath id={id}>
      {/* Head */}
      <ellipse cx="50" cy="24" rx="20" ry="22" />
      {/* Neck */}
      <rect x="43" y="44" width="14" height="12" rx="4" />
      {/* Shoulders */}
      <ellipse cx="50" cy="62" rx={female ? 30 : 36} ry="12" />
      {/* Upper torso / bust area */}
      <ellipse cx="50" cy="84" rx={female ? 26 : 30} ry="14" />
      {/* Waist */}
      <ellipse cx="50" cy="112" rx={female ? 18 : 24} ry="12" />
      {/* Hips */}
      <ellipse cx="50" cy="138" rx={female ? 30 : 26} ry="14" />
      {/* Upper legs / pelvis connector */}
      <ellipse cx="50" cy="160" rx="26" ry="12" />
      {/* Left thigh */}
      <rect x="18" y="148" width="22" height="56" rx="11" />
      {/* Right thigh */}
      <rect x="60" y="148" width="22" height="56" rx="11" />
      {/* Left knee */}
      <ellipse cx="29" cy="210" rx="11" ry="10" />
      {/* Right knee */}
      <ellipse cx="71" cy="210" rx="11" ry="10" />
      {/* Left calf */}
      <rect x="20" y="206" width="18" height="62" rx="9" />
      {/* Right calf */}
      <rect x="62" y="206" width="18" height="62" rx="9" />
      {/* Left ankle */}
      <ellipse cx="29" cy="272" rx="9" ry="8" />
      {/* Right ankle */}
      <ellipse cx="71" cy="272" rx="9" ry="8" />
      {/* Left foot */}
      <rect x="18" y="268" width="20" height="28" rx="8" />
      {/* Right foot */}
      <rect x="62" y="268" width="20" height="28" rx="8" />
    </clipPath>
  )
}

export function WaterTracker({ consumedMl, goalMl, gender }: WaterTrackerProps) {
  const { consumed: currentMl, percent, remainingMl, addWater } = useWaterTracker({ consumedMl, goalMl })

  const isFemale = gender === 'female'
  const uid = isFemale ? 'f4' : 'm4'

  const BODY_TOP = 2
  const BODY_BOT = 296
  const waterY = BODY_BOT - ((BODY_BOT - BODY_TOP) * Math.min(percent, 100)) / 100

  return (
    <div className="flex flex-col items-center gap-6">

      <div style={{ filter: 'drop-shadow(0 16px 40px rgba(0,180,255,0.22))' }}>
        <svg width="180" height="558" viewBox="0 0 100 310" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#38d9f5" />
              <stop offset="55%"  stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <linearGradient id={`sh-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="white" stopOpacity="0.28" />
              <stop offset="35%"  stopColor="white" stopOpacity="0.07" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            <BodyDef id={`cp-${uid}`} female={isFemale} />

            <style>{`
              @keyframes ww-${uid} {
                from { transform: translateX(0); }
                to   { transform: translateX(-80px); }
              }
            `}</style>
          </defs>

          {/* Ghost body */}
          <g opacity="0.35" fill="var(--muted)">
            <ellipse cx="50" cy="24" rx="20" ry="22" />
            <rect x="43" y="44" width="14" height="12" rx="4" />
            <ellipse cx="50" cy="62" rx={isFemale ? 30 : 36} ry="12" />
            <ellipse cx="50" cy="84" rx={isFemale ? 26 : 30} ry="14" />
            <ellipse cx="50" cy="112" rx={isFemale ? 18 : 24} ry="12" />
            <ellipse cx="50" cy="138" rx={isFemale ? 30 : 26} ry="14" />
            <ellipse cx="50" cy="160" rx="26" ry="12" />
            <rect x="18" y="148" width="22" height="56" rx="11" />
            <rect x="60" y="148" width="22" height="56" rx="11" />
            <ellipse cx="29" cy="210" rx="11" ry="10" />
            <ellipse cx="71" cy="210" rx="11" ry="10" />
            <rect x="20" y="206" width="18" height="62" rx="9" />
            <rect x="62" y="206" width="18" height="62" rx="9" />
            <ellipse cx="29" cy="272" rx="9" ry="8" />
            <ellipse cx="71" cy="272" rx="9" ry="8" />
            <rect x="18" y="268" width="20" height="28" rx="8" />
            <rect x="62" y="268" width="20" height="28" rx="8" />
          </g>

          {/* Water fill */}
          <g clipPath={`url(#cp-${uid})`}>
            <rect x="0" y="0" width="100" height="310" fill={`url(#g-${uid})`} />

            {/* white mask animated down */}
            <motion.rect
              x="0" width="100"
              initial={{ height: 310 }}
              animate={{ height: waterY }}
              transition={{ duration: 1.2, ease: [0.34, 1.1, 0.64, 1] }}
              fill="var(--background)"
            />

            {/* wave */}
            <motion.g
              initial={{ y: 300 }}
              animate={{ y: waterY - 8 }}
              transition={{ duration: 1.2, ease: [0.34, 1.1, 0.64, 1] }}
            >
              <g style={{ animation: `ww-${uid} 2.6s linear infinite` }}>
                <path
                  d="M-80 8 Q-60 0 -40 8 Q-20 16 0 8 Q20 0 40 8 Q60 16 80 8 Q100 0 120 8 Q140 16 160 8 L160 50 L-80 50 Z"
                  fill={`url(#g-${uid})`}
                />
              </g>
            </motion.g>

            {/* shimmer */}
            <motion.rect
              x="0" width="34"
              animate={{ y: waterY }}
              initial={{ y: 310 }}
              transition={{ duration: 1.2, ease: [0.34, 1.1, 0.64, 1] }}
              height="310" fill={`url(#sh-${uid})`}
            />
          </g>

          {/* Percent */}
          <text x="50" y="180" textAnchor="middle" fontSize="14" fontWeight="700"
            fill="white" opacity="0.9"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            {Math.round(percent)}%
          </text>
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-3xl font-bold">
          {currentMl}
          <span className="text-base font-normal ml-1" style={{ color: 'var(--muted-foreground)' }}>ml</span>
        </p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>of {goalMl} ml goal</p>
        {remainingMl > 0
          ? <p className="text-xs font-medium text-sky-500">{remainingMl} ml remaining</p>
          : <p className="text-xs font-semibold text-green-500">Goal reached! 🎉</p>
        }
      </div>

      <div className="flex gap-2">
        {QUICK_ADD.map(ml => (
          <Button key={ml} size="sm" variant="outline" onClick={() => addWater(ml)}
            className="rounded-xl font-medium"
            style={{ borderColor: 'rgba(14,165,233,0.3)' }}>
            +{ml}ml
          </Button>
        ))}
      </div>
    </div>
  )
}
