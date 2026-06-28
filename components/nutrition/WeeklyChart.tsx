'use client'

interface Day { date: string; calories: number }
interface WeeklyChartProps {
  days: Day[]
  target: number
  selected: string
  onSelectDay: (date: string) => void
}

export function WeeklyChart({ days, selected, onSelectDay }: WeeklyChartProps) {
  return (
    <div className="flex gap-1.5">
      {days.map(d => {
        const dt = new Date(d.date + 'T00:00:00')
        const label = dt.toLocaleDateString('en-US', { weekday: 'short' })
        const dateNum = dt.getDate()
        const isActive = d.date === selected
        const hasData = d.calories > 0

        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelectDay(d.date)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[10px] border-none transition-colors"
            style={{
              background: isActive ? 'var(--foreground)' : 'transparent',
              color: isActive ? 'var(--background)' : 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.05em]">{label}</span>
            <span
              className="text-[1.3rem] font-bold leading-none"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {dateNum}
            </span>
            <span
              className="text-[10px] font-medium tabular-nums"
              style={{ opacity: hasData ? 1 : 0 }}
            >
              {d.calories} kcal
            </span>
          </button>
        )
      })}
    </div>
  )
}
