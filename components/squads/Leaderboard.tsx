'use client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Flame } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import type { SquadMember } from '@/types'

export function Leaderboard({ members }: { members: SquadMember[] }) {
  const { t } = useLanguage()
  const sorted = [...members].sort((a, b) => b.currentStreak - a.currentStreak)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-2">
      {sorted.map((member, i) => (
        <div key={member.userId} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
          <span className="text-xl w-8 text-center select-none">{medals[i] ?? `${i + 1}.`}</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{member.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{member.username}</p>
            <p className="text-xs text-muted-foreground">{t('squads.days_completed', { n: member.completedDays })}</p>
          </div>
          <div className="flex items-center gap-1 text-orange-400 shrink-0">
            <Flame className="h-4 w-4" />
            <span className="font-bold text-sm">{member.currentStreak}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
