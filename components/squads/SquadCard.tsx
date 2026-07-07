'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import type { Squad } from '@/types'

interface SquadCardProps {
  squad: Squad
  onClick?: () => void
}

export function SquadCard({ squad, onClick }: SquadCardProps) {
  const { t } = useLanguage()
  const topStreak = Math.max(...squad.members.map(m => m.currentStreak), 0)
  const count = squad.members.length

  return (
    <Card
      onClick={onClick}
      className={onClick ? 'hover:border-primary/50 transition-colors cursor-pointer' : ''}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{squad.name}</span>
          <Badge variant="outline" className="font-mono text-xs">{squad.code}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>{count === 1 ? t('squads.member', { n: count }) : t('squads.members', { n: count })}</span>
        </div>
        <div className="text-sm">
          {t('squads.top_streak')} <span className="font-bold text-orange-400">{t('squads.days', { n: topStreak })}</span>
        </div>
      </CardContent>
    </Card>
  )
}
