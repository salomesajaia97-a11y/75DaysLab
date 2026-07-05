'use client'
import { useState } from 'react'
import { Home, Dumbbell, CalendarDays, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DIFFICULTY_LABEL, GOAL_LABEL, type TrainingPlan } from '@/lib/fitness/workoutPlans'
import { useMarkComplete } from '@/hooks/useMarkComplete'

interface Props {
  plan: TrainingPlan
}

/** Recommended plans have no per-session length yet — use a sensible default. */
const PLAN_SESSION_MINUTES = 30

export function TrainingPlanCard({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const { done, markComplete } = useMarkComplete()
  const LocIcon = plan.location === 'home' ? Home : Dumbbell

  const complete = () =>
    markComplete({
      kind: 'structured',
      source: 'plan',
      title: plan.title,
      exerciseSlugs: [],
      minutes: PLAN_SESSION_MINUTES,
    })

  return (
    <>
      <div
        className="group/plan flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/60 bg-background transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: `0 18px 40px -22px ${plan.accent}66` }}
      >
        {/* Pastel banner */}
        <div className="relative overflow-hidden p-6" style={{ background: plan.gradient }}>
          {/* soft light orbs */}
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.65), transparent 70%)' }} />
          <div className="pointer-events-none absolute -left-10 -bottom-14 h-36 w-36 rounded-full" style={{ background: `radial-gradient(circle, ${plan.accent}22, transparent 70%)` }} />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#2d3142] backdrop-blur-sm">
                <LocIcon className="h-3 w-3" /> {plan.location === 'home' ? 'Home' : 'Gym'}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#2d3142] backdrop-blur-sm">
                {DIFFICULTY_LABEL[plan.difficulty]}
              </span>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover/plan:scale-110">
              {plan.emoji}
            </span>
          </div>

          <h3 className="relative mt-4 max-w-[85%] text-xl font-bold leading-tight text-[#2d3142] font-heading">{plan.title}</h3>
          <p className="relative mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2d3142]/70">
            <CalendarDays className="h-3.5 w-3.5" /> {plan.durationDays}-day plan
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
          <div className="mt-auto flex items-center gap-2">
            <Button
              className="flex-1"
              variant={done ? 'outline' : 'default'}
              disabled={done}
              onClick={complete}
            >
              <CheckCircle2 className="h-4 w-4" /> {done ? 'Completed' : 'Mark complete'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(true)}>Details</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="-mx-4 -mt-4 mb-1 p-5" style={{ background: plan.gradient }}>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-black/10 bg-white/70 text-[#2d3142]">
                <LocIcon className="h-3 w-3" /> {plan.location === 'home' ? 'Home' : 'Gym'}
              </Badge>
              <Badge variant="outline" className="border-black/10 bg-white/70 text-[#2d3142]">
                {DIFFICULTY_LABEL[plan.difficulty]}
              </Badge>
            </div>
            <span className="text-3xl">{plan.emoji}</span>
          </div>
          <DialogHeader>
            <DialogTitle>{plan.title}</DialogTitle>
            <DialogDescription>{plan.description}</DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</dt>
              <dd className="text-sm font-semibold">{plan.durationDays} days</dd>
            </div>
            <div className="rounded-xl border border-border p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Level</dt>
              <dd className="text-sm font-semibold">{DIFFICULTY_LABEL[plan.difficulty]}</dd>
            </div>
            <div className="rounded-xl border border-border p-2.5">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Goal</dt>
              <dd className="text-sm font-semibold leading-tight">{GOAL_LABEL[plan.goal]}</dd>
            </div>
          </dl>

          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Progress at your own pace. Warm up before each session, focus on good form, and rest when you need to.</span>
          </div>

          <Button
            className="w-full"
            variant={done ? 'outline' : 'default'}
            disabled={done}
            onClick={() => { complete(); setOpen(false) }}
          >
            <CheckCircle2 className="h-4 w-4" /> {done ? 'Completed' : 'Mark complete'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
