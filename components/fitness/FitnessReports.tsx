'use client'
import { useEffect, useState } from 'react'
import { Scale, Activity, CalendarCheck, Dumbbell, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getProfile } from '@/lib/storage'
import { useLanguage } from '@/lib/i18n'
import { useFitnessProgress } from '@/hooks/useFitnessProgress'
import type { UserProfile } from '@/types'

function bmiCategory(bmi: number): { key: string; color: string } {
  if (bmi < 18.5) return { key: 'fitness.bmi_underweight', color: '#3b82c4' }
  if (bmi < 25) return { key: 'fitness.bmi_healthy', color: '#20a06b' }
  if (bmi < 30) return { key: 'fitness.bmi_overweight', color: '#d4a017' }
  return { key: 'fitness.bmi_high', color: '#c4763b' }
}

function ReportTile({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </p>
      {children}
    </div>
  )
}

export function FitnessReports() {
  const { t } = useLanguage()
  const { totalSessions, fullDays, completionRate } = useFitnessProgress()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  useEffect(() => {
    // hydration-safe profile read
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(getProfile())
  }, [])

  const bmi = profile && profile.heightCm > 0
    ? profile.weightKg / ((profile.heightCm / 100) ** 2)
    : null
  const cat = bmi ? bmiCategory(bmi) : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('fitness.reports_title')}</CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('fitness.reports_desc')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Weight log */}
          <ReportTile icon={<Scale className="h-3.5 w-3.5 text-primary" />} title={t('fitness.weight')}>
            {profile ? (
              <p className="text-2xl font-bold tabular-nums">{profile.weightKg.toFixed(1)}<span className="ml-1 text-sm font-medium text-muted-foreground">kg</span></p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('fitness.weight_empty')}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{t('fitness.last_30_days')}</p>
          </ReportTile>

          {/* BMI */}
          <ReportTile icon={<Activity className="h-3.5 w-3.5 text-primary" />} title="BMI">
            {bmi && cat ? (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tabular-nums">{bmi.toFixed(1)}</p>
                <Badge variant="outline" style={{ color: cat.color, borderColor: cat.color }}>{t(cat.key)}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('fitness.bmi_empty')}</p>
            )}
          </ReportTile>

          {/* Weekly completion */}
          <ReportTile icon={<CalendarCheck className="h-3.5 w-3.5 text-primary" />} title={t('fitness.weekly_completion')}>
            <p className="mb-2 text-2xl font-bold tabular-nums">{completionRate}%</p>
            <Progress value={completionRate} />
          </ReportTile>

          {/* Completed sessions */}
          <ReportTile icon={<Dumbbell className="h-3.5 w-3.5 text-primary" />} title={t('fitness.completed_sessions')}>
            <p className="text-2xl font-bold tabular-nums">{totalSessions}<span className="ml-1 text-sm font-medium text-muted-foreground">/ 14</span></p>
            <p className="mt-1 text-xs text-muted-foreground">{t('fitness.full_days_week', { n: fullDays })}</p>
          </ReportTile>

          {/* Goal progress */}
          <ReportTile icon={<Target className="h-3.5 w-3.5 text-primary" />} title={t('fitness.goal_progress')}>
            <p className="mb-2 text-2xl font-bold tabular-nums">{fullDays} / 7</p>
            <Progress value={Math.round((fullDays / 7) * 100)} />
            <p className="mt-1 text-xs text-muted-foreground">{t('fitness.full_workout_days')}</p>
          </ReportTile>
        </div>
      </CardContent>
    </Card>
  )
}
