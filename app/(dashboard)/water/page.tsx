'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterTracker } from '@/components/water/WaterTracker'
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
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('water.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('water.card_title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('water.goal_desc', { ml: goalMl })}</p>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <WaterTracker consumedMl={0} goalMl={goalMl} gender={gender} />
        </CardContent>
      </Card>
    </div>
  )
}
