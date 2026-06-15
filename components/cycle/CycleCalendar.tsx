'use client'
import React, { useState, useEffect, useContext, createContext } from 'react'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CyclePrediction {
  periodDates: Date[]
  ovulationDate: Date
  fertileDates: Date[]
}

interface DayLog { moods: string[]; symptoms: string[] }
type DailyLogs = Record<string, DayLog>

interface CycleCalendarProps {
  predictions: CyclePrediction
  onPeriodLogged?: (start: Date, end: Date) => void
  onPeriodCleared?: () => void
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Period (predicted)', bg: '#fbeef1', color: '#d9383a' },
  { label: 'Fertile window',     bg: '#e3f2fd', color: '#1e88e5' },
  { label: 'Ovulation',         bg: '#f3eaff', color: '#7b1fa2' },
]

const MOODS = [
  { id: 'happy',     label: 'Happy',     emoji: '😊', bg: '#fff9c4', color: '#f57f17' },
  { id: 'moody',     label: 'Moody',     emoji: '🎢', bg: '#fce4ec', color: '#c2185b' },
  { id: 'sad',       label: 'Sad',       emoji: '😢', bg: '#e3f2fd', color: '#1565c0' },
  { id: 'anxious',   label: 'Anxious',   emoji: '😟', bg: '#f3e5f5', color: '#6a1b9a' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡', bg: '#e8f5e9', color: '#2e7d32' },
]

const SYMPTOMS = [
  { id: 'cramps',   label: 'Cramps',   emoji: '💢', bg: '#fce4ec', color: '#b71c1c' },
  { id: 'bloating', label: 'Bloating', emoji: '🎈', bg: '#fff3e0', color: '#e65100' },
  { id: 'headache', label: 'Headache', emoji: '🤕', bg: '#fbe9e7', color: '#bf360c' },
  { id: 'fatigue',  label: 'Fatigue',  emoji: '🥱', bg: '#ede7f6', color: '#4527a0' },
  { id: 'acne',     label: 'Acne',     emoji: '🧼', bg: '#e8eaf6', color: '#283593' },
]

export const LS_KEY = 'cycle_logged_period'
const LS_LOGS_KEY = 'cycle_daily_logs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtKey(d: Date) { return d.toISOString().split('T')[0] }
function norm(d: Date) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n }

function dateRange(start: Date, end: Date): Date[] {
  const out: Date[] = []
  const cur = norm(start)
  const end_ = norm(end)
  while (cur <= end_) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return out
}

function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })
}

// ─── Context + custom DayButton (module-level = stable ref) ───────────────────
const LogsCtx = createContext<DailyLogs>({})

function DotDayButton({ children, day, ...rest }: any) {
  const logs = useContext(LogsCtx)
  const log  = logs[fmtKey(day.date)]
  const dot  = (log?.moods?.length || 0) + (log?.symptoms?.length || 0) > 0

  return (
    <CalendarDayButton day={day} {...rest}>
      {children}
      {dot && (
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: '#7b1fa2',
            opacity: 0.75,
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      )}
    </CalendarDayButton>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ emoji, label, active, bg, color, onClick }: {
  emoji: string; label: string; active: boolean
  bg: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[11px] font-medium select-none transition-all duration-150"
      style={{
        backgroundColor: active ? bg : 'rgba(245,243,239,0.85)',
        color: active ? color : '#9ca3af',
        border: `1.5px solid ${active ? color + '55' : 'transparent'}`,
        boxShadow: active ? `0 2px 10px ${color}28` : 'none',
        transform: active ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CycleCalendar({ predictions, onPeriodLogged, onPeriodCleared }: CycleCalendarProps) {
  const [step, setStep]               = useState<'start' | 'end'>('start')
  const [pendingStart, setPendingStart] = useState<Date | null>(null)
  const [loggedPeriod, setLoggedPeriod] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dailyLogs, setDailyLogs]       = useState<DailyLogs>({})

  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_KEY)
      if (p) {
        const { start, end } = JSON.parse(p)
        setLoggedPeriod({ start: new Date(start), end: new Date(end) })
      }
      const l = localStorage.getItem(LS_LOGS_KEY)
      if (l) setDailyLogs(JSON.parse(l))
    } catch {}
  }, [])

  function saveLogs(logs: DailyLogs) {
    setDailyLogs(logs)
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logs))
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const d = norm(date)
    setSelectedDate(d)

    if (step === 'end' && pendingStart) {
      const [s, e] = d < pendingStart ? [d, pendingStart] : [pendingStart, d]
      setLoggedPeriod({ start: s, end: e })
      localStorage.setItem(LS_KEY, JSON.stringify({ start: s.toISOString(), end: e.toISOString() }))
      onPeriodLogged?.(s, e)
      setPendingStart(null)
      setStep('start')
    } else if (!loggedPeriod) {
      setPendingStart(d)
      setStep('end')
    }
  }

  function clearPeriod() {
    setLoggedPeriod(null)
    setPendingStart(null)
    setStep('start')
    localStorage.removeItem(LS_KEY)
    onPeriodCleared?.()
  }

  function toggle(type: 'moods' | 'symptoms', id: string) {
    if (!selectedDate) return
    const k = fmtKey(selectedDate)
    const cur: DayLog = dailyLogs[k] ?? { moods: [], symptoms: [] }
    const arr = cur[type]
    saveLogs({
      ...dailyLogs,
      [k]: { ...cur, [type]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] },
    })
  }

  const loggedDates  = loggedPeriod ? dateRange(loggedPeriod.start, loggedPeriod.end) : []
  const pendingDates = pendingStart ? [pendingStart] : []
  const selLog: DayLog = (selectedDate && dailyLogs[fmtKey(selectedDate)]) || { moods: [], symptoms: [] }

  const hint = step === 'end' && pendingStart
    ? `Period start: ${pendingStart.toLocaleDateString()} — now click the end date`
    : !loggedPeriod
    ? 'Tap a date to start logging your period & feelings'
    : null

  return (
    <LogsCtx.Provider value={dailyLogs}>
      <div className="space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Menstrual Calendar</p>
          {loggedPeriod && (
            <button
              onClick={clearPeriod}
              className="text-[11px] text-rose-400 hover:text-rose-600 transition-colors underline underline-offset-2"
            >
              Clear Period Log
            </button>
          )}
        </div>

        {/* Legend chips */}
        <div className="flex gap-1.5 flex-wrap">
          {PHASES.map(({ label, bg, color }) => (
            <span
              key={label}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: bg, color }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Hint */}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}

        {/* Calendar grid */}
        <Calendar
          mode="single"
          onSelect={handleSelect}
          modifiers={{
            period:    predictions.periodDates,
            fertile:   predictions.fertileDates,
            ovulation: [predictions.ovulationDate].filter(Boolean),
            logged:    loggedDates,
            pending:   pendingDates,
          }}
          modifiersClassNames={{
            period:    '!bg-[#fbeef1] !text-[#d9383a] rounded-[var(--radius-md)]',
            fertile:   '!bg-[#e3f2fd] !text-[#1e88e5] rounded-[var(--radius-md)]',
            ovulation: '!bg-[#f3eaff] !text-[#7b1fa2] rounded-[var(--radius-md)]',
            logged:    '!bg-[#fbeef1] !text-[#d9383a] rounded-[var(--radius-md)]',
            pending:   '!bg-[#fbeef1] !text-[#d9383a] opacity-70 ring-1 ring-[#d9383a] rounded-[var(--radius-md)]',
          }}
          classNames={{
            today: '!bg-primary rounded-[var(--radius-md)] [&_button]:!text-primary-foreground',
            outside: '!bg-transparent [&_button]:!bg-transparent [&_button]:!text-muted-foreground [&_button]:opacity-30 pointer-events-none',
          }}
          components={{ DayButton: DotDayButton as any }}
          className="w-full !bg-transparent"
        />

        {/* Logged footer */}
        {loggedPeriod && (
          <p className="text-[11px] text-muted-foreground">
            Period: {loggedPeriod.start.toLocaleDateString()} – {loggedPeriod.end.toLocaleDateString()}
          </p>
        )}

        {/* Symptom & Mood panel */}
        {selectedDate && (
          <div
            className="rounded-3xl p-4 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.76)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            }}
          >
            <p className="text-sm font-semibold text-foreground">
              How were you feeling on {fmtDisplay(selectedDate)}?
            </p>

            {/* Moods */}
            <section>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mood</p>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(m => (
                  <Chip
                    key={m.id}
                    emoji={m.emoji}
                    label={m.label}
                    active={selLog.moods.includes(m.id)}
                    bg={m.bg}
                    color={m.color}
                    onClick={() => toggle('moods', m.id)}
                  />
                ))}
              </div>
            </section>

            {/* Symptoms */}
            <section>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Symptoms</p>
              <div className="flex gap-2 flex-wrap">
                {SYMPTOMS.map(s => (
                  <Chip
                    key={s.id}
                    emoji={s.emoji}
                    label={s.label}
                    active={selLog.symptoms.includes(s.id)}
                    bg={s.bg}
                    color={s.color}
                    onClick={() => toggle('symptoms', s.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

      </div>
    </LogsCtx.Provider>
  )
}
