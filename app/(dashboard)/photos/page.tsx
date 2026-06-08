'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoUpload } from '@/components/photos/PhotoUpload'
import { PhotoComparison } from '@/components/photos/PhotoComparison'
import { getProfile, saveProfile } from '@/lib/storage'
import { calculateCurrentDay } from '@/lib/calculations'
import { useLanguage } from '@/lib/i18n'

interface PhotoEntry {
  dayNumber: number
  url: string
}

const PLACEHOLDER = 'https://placehold.co/400x600/1a1a2e/ffffff?text=No+Photo'

export default function PhotosPage() {
  const { t } = useLanguage()
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [compareA, setCompareA] = useState<number>(1)
  const [compareB, setCompareB] = useState<number>(2)
  const [currentDay, setCurrentDay] = useState(1)

  useEffect(() => {
    const cached = getProfile()
    if (cached) {
      setCurrentDay(calculateCurrentDay(cached.startDate, cached.totalDays))
    } else {
      fetch('/api/users/me')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            saveProfile(data)
            setCurrentDay(calculateCurrentDay(data.startDate, data.totalDays))
          }
        })
        .catch(() => {})
    }

    fetch('/api/photos')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setPhotos(data.map((p: { dayNumber: number; url: string }) => ({
            dayNumber: p.dayNumber,
            url: p.url,
          })))
        }
      })
      .catch(() => {})
  }, [])

  function handleUploaded(url: string) {
    setPhotos(prev => {
      const existing = prev.findIndex(p => p.dayNumber === currentDay)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { dayNumber: currentDay, url }
        return updated
      }
      return [...prev, { dayNumber: currentDay, url }]
    })
  }

  function getPhotoUrl(day: number): string {
    return photos.find(p => p.dayNumber === day)?.url ?? PLACEHOLDER
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t('photos.title')}</h1>
      <Tabs defaultValue="upload">
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1">{t('photos.tab.upload')}</TabsTrigger>
          <TabsTrigger value="compare" className="flex-1">{t('photos.tab.compare')}</TabsTrigger>
          <TabsTrigger value="vault" className="flex-1">{t('photos.tab.vault')}</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader><CardTitle>{t('photos.day_photo', { n: currentDay })}</CardTitle></CardHeader>
            <CardContent>
              <PhotoUpload dayNumber={currentDay} onUploaded={handleUploaded} />
              {photos.some(p => p.dayNumber === currentDay) && (
                <p className="text-xs text-green-500 text-center mt-3">{t('photos.day_saved', { n: currentDay })}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>{t('photos.compare_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('photos.before')}</label>
                  <input
                    type="number"
                    min={1}
                    value={compareA}
                    onChange={e => setCompareA(Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('photos.after')}</label>
                  <input
                    type="number"
                    min={1}
                    value={compareB}
                    onChange={e => setCompareB(Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <PhotoComparison
                beforeUrl={getPhotoUrl(compareA)}
                afterUrl={getPhotoUrl(compareB)}
                beforeLabel={`Day ${compareA}`}
                afterLabel={`Day ${compareB}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault">
          <Card>
            <CardHeader><CardTitle>{t('photos.vault_title', { n: photos.length })}</CardTitle></CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">{t('photos.empty')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <div key={p.dayNumber} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={p.url} alt={`Day ${p.dayNumber}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {t('photos.day_label', { n: p.dayNumber })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
