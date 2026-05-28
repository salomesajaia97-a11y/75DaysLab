'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      setError('Failed to save. Please try again.')
      return
    }
    router.push('/dashboard')
  }

  const genderOptions: { value: Gender; label: string }[] = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'other', label: 'Other' },
  ]

  const goalOptions: { value: Goal; label: string; desc: string }[] = [
    { value: 'lose', label: 'Lose Weight', desc: 'Caloric deficit, fat loss focus' },
    { value: 'gain', label: 'Gain Muscle', desc: 'Caloric surplus, protein priority' },
    { value: 'maintain', label: 'Maintain', desc: 'Balanced macros, body recomp' },
  ]

  const focusOptions: { value: FocusArea; label: string }[] = [
    { value: 'nutrition', label: 'Nutrition' },
    { value: 'workout', label: 'Workout' },
    { value: 'sleep', label: 'Sleep' },
    { value: 'other', label: 'Other' },
  ]

  const stepTitles: Record<Step, string> = {
    profile: 'Tell us about yourself',
    goals: "What's your goal?",
    focus: 'Your biggest challenge?',
    timeline: 'Set your timeline',
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
        <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</p>
        <CardTitle className="text-2xl">{stepTitles[step]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {step === 'profile' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex gap-2">
                  {genderOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => update('gender', o.value)}
                      className={cn(
                        'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
                        data.gender === o.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                      )}
                    >{o.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input type="number" placeholder="170" value={data.heightCm} onChange={e => update('heightCm', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
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
                <div className="font-semibold">{o.label}</div>
                <div className="text-sm text-muted-foreground">{o.desc}</div>
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
              >{o.label}</button>
            ))}
          </div>
        )}

        {step === 'timeline' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Days <span className="text-muted-foreground font-normal">(default 75)</span></Label>
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
            <Button variant="outline" className="flex-1" onClick={back} disabled={loading}>Back</Button>
          )}
          {step !== 'timeline' ? (
            <Button className="flex-1" onClick={next} disabled={!canAdvance()}>Continue</Button>
          ) : (
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Challenge
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
