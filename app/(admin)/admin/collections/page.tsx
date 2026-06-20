'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Database, Lock, ChevronRight } from 'lucide-react'

const FULL_ACCESS = [
  { model: 'user',      label: 'Users' },
  { model: 'challenge', label: 'Challenges' },
  { model: 'squad',     label: 'Squads' },
  { model: 'photo',     label: 'Photos' },
]

const READ_ONLY = [
  { model: 'cyclelog',     label: 'Cycle Logs' },
  { model: 'dailylog',     label: 'Daily Logs' },
  { model: 'foodlog',      label: 'Food Logs' },
  { model: 'waterlog',     label: 'Water Logs' },
  { model: 'journalentry', label: 'Journal Entries' },
]

interface CountMap {
  [model: string]: number
}

export default function CollectionsPage() {
  const [counts, setCounts] = useState<CountMap>({})

  useEffect(() => {
    const allModels = [...FULL_ACCESS, ...READ_ONLY]
    Promise.allSettled(
      allModels.map((m) =>
        fetch(`/api/admin/collections/${m.model}?page=1`)
          .then((r) => r.json())
          .then((d) => ({ model: m.model, total: d.total ?? 0 }))
      )
    ).then((results) => {
      const map: CountMap = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') map[r.value.model] = r.value.total
      })
      setCounts(map)
    })
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and manage MongoDB collections.
        </p>
      </div>

      <div className="space-y-6">
        {/* Full access */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Full Access
          </p>
          <div className="grid grid-cols-2 gap-4">
            {FULL_ACCESS.map((m) => (
              <Link key={m.model} href={`/admin/collections/${m.model}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {counts[m.model] != null ? `${counts[m.model]} documents` : '...'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Read only */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Read Only (User Health Data)
          </p>
          <div className="grid grid-cols-2 gap-4">
            {READ_ONLY.map((m) => (
              <Link key={m.model} href={`/admin/collections/${m.model}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-80">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {counts[m.model] != null ? `${counts[m.model]} documents` : '...'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
