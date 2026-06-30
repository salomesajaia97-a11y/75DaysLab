'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterTracker } from '@/components/water/WaterTracker'
import { ScrollReveal, Aurora } from '@/components/shared/Motion'
import { getProfile, saveProfile } from '@/lib/storage'
import { calculateWaterGoal } from '@/lib/calculations'
import { useLanguage } from '@/lib/i18n'
import type { UserProfile } from '@/types'

export default function WaterPage() {
  const { t } = useLanguage()
  const [goalMl, setGoalMl] = useState(() => {
    const p = getProfile()
    return p ? calculateWaterGoal(p.age, p.weightKg, p.heightCm, p.gender, p.goal) : 2500
  })
  const [gender, setGender] = useState<UserProfile['gender'] | null>(() => getProfile()?.gender ?? null)

  useEffect(() => {
    function applyProfile(profile: UserProfile) {
      setGoalMl(calculateWaterGoal(profile.age, profile.weightKg, profile.heightCm, profile.gender, profile.goal))
      setGender(profile.gender ?? null)
    }

    const cached = getProfile()
    if (cached) {
      applyProfile(cached)
    } else {
      fetch('/api/users/me')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            saveProfile(data)
            applyProfile(data)
          }
        })
        .catch(() => {})
    }
  }, [])

  return (
    <div className="relative">
      <Aurora />
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <ScrollReveal>
          <div
            className="living-gradient relative overflow-hidden rounded-[2rem] p-7 md:p-8"
            style={{
              background: 'linear-gradient(120deg, #d8ecff 0%, #c6dcff 42%, #dbe6ff 72%, #ece3ff 100%)',
              boxShadow: '0 24px 60px -28px rgba(47, 114, 214, 0.42)',
            }}
          >
            <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)' }} />
            <div className="pointer-events-none absolute -left-12 -bottom-20 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(47,114,214,0.16), transparent 70%)' }} />
            <span className="shine-sweep" />
            <div className="relative">
              <span className="inline-block h-1.5 w-12 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #5eb6f7, #2f72d6)' }} />
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-[#2d3142]">{t('water.title')}</h1>
              <p className="text-[#2d3142]/70 mt-2">{t('water.goal_desc', { ml: goalMl })}</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle>{t('water.card_title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <WaterTracker consumedMl={0} goalMl={goalMl} gender={gender} />
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  )
}
