'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SquadCard } from '@/components/squads/SquadCard'
import { Leaderboard } from '@/components/squads/Leaderboard'
import { Plus, Hash } from 'lucide-react'
import type { Squad } from '@/types'

const MOCK_SQUADS: Squad[] = [
  {
    id: '1',
    name: 'Morning Warriors',
    code: 'MORN75',
    members: [
      { userId: '1', username: 'salome', currentStreak: 12, completedDays: 12 },
      { userId: '2', username: 'alex', currentStreak: 8, completedDays: 10 },
      { userId: '3', username: 'jordan', currentStreak: 15, completedDays: 15 },
    ],
  },
]

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>(MOCK_SQUADS)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  function createSquad() {
    if (!newName.trim()) return
    const squad: Squad = {
      id: Date.now().toString(),
      name: newName.trim(),
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      members: [{ userId: 'me', username: 'you', currentStreak: 1, completedDays: 1 }],
    }
    setSquads(prev => [...prev, squad])
    setNewName('')
    setCreateOpen(false)
  }

  function joinSquad() {
    if (!joinCode.trim()) return
    // Phase 1: mock join
    setJoinCode('')
    setJoinOpen(false)
  }

  if (selectedSquad) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedSquad(null)}>← Back</Button>
          <h1 className="text-2xl font-bold">{selectedSquad.name}</h1>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{selectedSquad.code}</span>
        </div>
        <Card>
          <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <Leaderboard members={selectedSquad.members} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Squads</h1>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Hash className="h-4 w-4 mr-1" />Join
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Join a Squad</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Squad Code</Label>
                  <Input placeholder="MORN75" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                </div>
                <Button className="w-full" onClick={joinSquad}>Join Squad</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="h-4 w-4 mr-1" />Create
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a Squad</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Squad Name</Label>
                  <Input placeholder="Morning Warriors" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <Button className="w-full" onClick={createSquad} disabled={!newName.trim()}>Create Squad</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {squads.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No squads yet. Create one or join with a code.</p>
      ) : (
        <div className="grid gap-4">
          {squads.map(squad => (
            <SquadCard key={squad.id} squad={squad} onClick={() => setSelectedSquad(squad)} />
          ))}
        </div>
      )}
    </div>
  )
}
