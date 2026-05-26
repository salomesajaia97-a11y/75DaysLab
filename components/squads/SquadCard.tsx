import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import type { Squad } from '@/types'

interface SquadCardProps {
  squad: Squad
  onClick?: () => void
}

export function SquadCard({ squad, onClick }: SquadCardProps) {
  const topStreak = Math.max(...squad.members.map(m => m.currentStreak), 0)

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
          <span>{squad.members.length} member{squad.members.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-sm">
          Top streak: <span className="font-bold text-orange-400">{topStreak} days</span>
        </div>
      </CardContent>
    </Card>
  )
}
