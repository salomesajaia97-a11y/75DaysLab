'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import type { Goal, FocusArea, Gender } from '@/types'

type Step = 'profile' | 'goals' | 'focus' | 'timeline'

interface OnboardingData {
  age: string
  gender: Gender | ''
  heightCm: string
  weightKg: string
  goal: Goal | ''
  focusArea: FocusArea | ''
  totalDays: string
  startDate: string
}

const STEPS: Step[] = ['profile', 'goals', 'focus', 'timeline']

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    age: '', gender: '', heightCm: '', weightKg: '',
    goal: '', focusArea: '', totalDays: '75',
    startDate: new Date().toISOString().split('T')[0],
  })

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  function update(field: keyof OnboardingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  function canAdvance(): boolean {
    if (step === 'profile') return !!data.age && !!data.gender && !!data.heightCm && !!data.weightKg
    if (step === 'goals') return !!data.goal
    if (step === 'focus') return !!data.focusArea
    return true
  }

  async function submit() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/users/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      setError(t('onboarding.error_save'))
      return
    }
    router.push('/dashboard')
  }

  const genderOptions: { value: Gender; labelKey: string }[] = [
    { value: 'female', labelKey: 'onboarding.profile.female' },
    { value: 'male', labelKey: 'onboarding.profile.male' },
    { value: 'other', labelKey: 'onboarding.profile.other' },
  ]

  const goalOptions: { value: Goal; labelKey: string; descKey: string }[] = [
    { value: 'lose', labelKey: 'onboarding.goals.lose_label', descKey: 'onboarding.goals.lose_desc' },
    { value: 'gain', labelKey: 'onboarding.goals.gain_label', descKey: 'onboarding.goals.gain_desc' },
    { value: 'maintain', labelKey: 'onboarding.goals.maintain_label', descKey: 'onboarding.goals.maintain_desc' },
  ]

  const focusOptions: { value: FocusArea; labelKey: string }[] = [
    { value: 'nutrition', labelKey: 'onboarding.focus.nutrition' },
    { value: 'workout', labelKey: 'onboarding.focus.workout' },
    { value: 'sleep', labelKey: 'onboarding.focus.sleep' },
    { value: 'other', labelKey: 'onboarding.focus.other' },
  ]

  const stepTitleKeys: Record<Step, string> = {
    profile: 'onboarding.profile.title',
    goals: 'onboarding.goals.title',
    focus: 'onboarding.focus.title',
    timeline: 'onboarding.timeline.title',
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('onboarding.step_of', { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <CardTitle className="text-2xl">{t(stepTitleKeys[step])}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {step === 'profile' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('onboarding.profile.age')}</Label>
                <Input type="number" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('onboarding.profile.gender')}</Label>
                <div className="flex gap-2">
                  {genderOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => update('gender', o.value)}
                      className={cn(
                        'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
                        data.gender === o.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                      )}
                    >{t(o.labelKey)}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('onboarding.profile.height')}</Label>
                <Input type="number" placeholder="170" value={data.heightCm} onChange={e => update('heightCm', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('onboarding.profile.weight')}</Label>
                <Input type="number" placeholder="70" value={data.weightKg} onChange={e => update('weightKg', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {step === 'goals' && (
          <div className="space-y-3">
            {goalOptions.map(o => (
              <button
                key={o.value}
                onClick={() => update('goal', o.value)}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-colors',
                  data.goal === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                )}
              >
                <div className="font-semibold">{t(o.labelKey)}</div>
                <div className="text-sm text-muted-foreground">{t(o.descKey)}</div>
              </button>
            ))}
          </div>
        )}

        {step === 'focus' && (
          <div className="grid grid-cols-2 gap-3">
            {focusOptions.map(o => (
              <button
                key={o.value}
                onClick={() => update('focusArea', o.value)}
                className={cn(
                  'p-4 rounded-lg border font-medium transition-colors',
                  data.focusArea === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                )}
              >{t(o.labelKey)}</button>
            ))}
          </div>
        )}

        {step === 'timeline' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('onboarding.timeline.start_date')}</Label>
              <Input type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                {t('onboarding.timeline.total_days')}{' '}
                <span className="text-muted-foreground font-normal">{t('onboarding.timeline.total_days_hint')}</span>
              </Label>
              <Input
                type="number" min="1" max="365"
                value={data.totalDays}
                onChange={e => update('totalDays', e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          {stepIndex > 0 && (
            <Button variant="outline" className="flex-1" onClick={back} disabled={loading}>{t('onboarding.back')}</Button>
          )}
          {step !== 'timeline' ? (
            <Button className="flex-1" onClick={next} disabled={!canAdvance()}>{t('onboarding.continue')}</Button>
          ) : (
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('onboarding.start')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
