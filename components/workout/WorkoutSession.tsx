'use client'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import type { WorkoutSessionState } from '@/types'
import { INDOOR_VIDEOS, OUTDOOR_VIDEOS } from './workoutVideos'

interface WorkoutSessionProps {
  type: 'indoor' | 'outdoor'
  session: WorkoutSessionState
  onToggleTimer(): void
  onResetTimer(): void
  onConfirmDone(): void
  onDismissConfirm(): void
  onToggleVideos(): void
  onManualToggle(): void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function WorkoutSession({
  type,
  session,
  onToggleTimer,
  onResetTimer,
  onConfirmDone,
  onDismissConfirm,
  onToggleVideos,
  onManualToggle,
}: WorkoutSessionProps) {
  const { t } = useLanguage()
  const label = type === 'indoor'
    ? `🏠 ${t('dashboard.workout.indoor')}`
    : `🌤️ ${t('dashboard.workout.outdoor')}`
  const videos = type === 'indoor' ? INDOOR_VIDEOS : OUTDOOR_VIDEOS
  const timerComplete = session.timerSeconds === 0
  const showReset = session.timerFinished || session.timerSeconds < 2700

  return (
    <div
      className={cn(
        'border rounded-xl p-3 transition-colors',
        session.done ? 'border-primary/30 bg-primary/5' : 'border-border'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onManualToggle} className="shrink-0" aria-label={`Mark ${type} workout ${session.done ? 'incomplete' : 'complete'}`}>
          {session.done
            ? <CheckCircle2 className="h-5 w-5 text-primary" />
            : <Circle className="h-5 w-5 text-muted-foreground" />
          }
        </button>
        <span className={cn('text-sm font-semibold flex-1', session.done && 'line-through text-muted-foreground')}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{t('dashboard.workout.min')}</span>
      </div>

      {/* Timer display (hidden when done) */}
      {!session.done && (
        <div className="bg-muted/50 rounded-lg p-3 text-center mb-2">
          <div className="text-2xl font-bold tabular-nums tracking-wider">
            {formatTime(session.timerSeconds)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('dashboard.workout.countdown')}</div>
        </div>
      )}

      {/* Timer controls */}
      {!session.done && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={onToggleTimer}
            disabled={timerComplete}
            aria-label={session.timerRunning ? 'Pause timer' : timerComplete ? 'Timer finished' : 'Start timer'}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              'bg-foreground text-background hover:opacity-90 disabled:opacity-40'
            )}
          >
            {session.timerRunning
              ? <><Pause className="h-3 w-3" />{t('dashboard.workout.pause')}</>
              : <><Play className="h-3 w-3" />{timerComplete ? t('dashboard.workout.done') : t('dashboard.workout.start')}</>
            }
          </button>
          {showReset && (
            <button
              onClick={onResetTimer}
              aria-label="Reset timer"
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Confirm banner */}
      {session.showConfirm && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-2">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
            {type === 'indoor' ? t('dashboard.workout.confirm_indoor') : t('dashboard.workout.confirm_outdoor')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirmDone}
              className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ {t('dashboard.workout.yes_done')}
            </button>
            <button
              onClick={onDismissConfirm}
              className="flex-1 border border-border rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              {t('dashboard.workout.keep_going')}
            </button>
          </div>
        </div>
      )}

      {/* AI suggestions toggle */}
      <button
        onClick={onToggleVideos}
        aria-expanded={session.showVideos}
        aria-label={session.showVideos ? 'Hide workout suggestions' : 'Show AI workout suggestions'}
        className="w-full border border-dashed border-border rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
        {session.showVideos ? `▲ ${t('dashboard.workout.hide_suggestions')}` : `✨ ${t('dashboard.workout.get_suggestions')}`}
      </button>

      {/* Video cards */}
      {session.showVideos && (
        <div className="mt-2 space-y-1.5">
          {videos.map(v => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2 transition-colors no-underline"
            >
              <span className="text-xl shrink-0">{v.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{v.channel} · YouTube ↗</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
