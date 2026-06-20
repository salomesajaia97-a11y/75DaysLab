'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, ChevronRight } from 'lucide-react'

interface PageInfo {
  pageId: string
  updatedAt: string | null
}

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  dashboard: 'Dashboard',
  login: 'Login',
  register: 'Register',
  cycle: 'Cycle Tracker',
  nutrition: 'Nutrition',
  journal: 'Journal',
  water: 'Water Tracker',
  fitness: 'Fitness',
  ai: 'AI Coach',
  photos: 'Progress Photos',
  squads: 'Squads',
}

export default function ContentManagerPage() {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/page-content')
      .then((r) => r.json())
      .then((data) => setPages(data.pages ?? []))
      .catch(() => setError('Failed to load pages'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Content Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit text content for each page. Changes apply immediately on next page load.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {pages.map((p) => (
          <Link key={p.pageId} href={`/admin/content/${p.pageId}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{PAGE_LABELS[p.pageId] ?? p.pageId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.updatedAt
                        ? `Updated ${new Date(p.updatedAt).toLocaleDateString()}`
                        : 'Using defaults'}
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
  )
}
