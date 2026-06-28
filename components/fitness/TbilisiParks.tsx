'use client'
import { MapPin, Trees } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n'
import { TBILISI_PARKS, type ParkActivity } from '@/lib/fitness/parks'

function activityLabel(a: ParkActivity, t: (k: string) => string): string {
  if (a === 'walk') return t('fitness.park_walk')
  if (a === 'run') return t('fitness.park_run')
  return t('fitness.park_both')
}

interface TbilisiParksProps {
  /** When the weather is bad we surface rain-friendly (paved/sheltered) spots first. */
  badWeather: boolean
}

/**
 * Tbilisi-only walking/running spots. The parent decides whether to render
 * this at all (city === Tbilisi); this component only orders by weather.
 */
export function TbilisiParks({ badWeather }: TbilisiParksProps) {
  const { t, locale } = useLanguage()

  const parks = [...TBILISI_PARKS].sort((a, b) =>
    badWeather ? Number(b.rainFriendly) - Number(a.rainFriendly) : 0,
  )

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Trees className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('fitness.parks_title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {badWeather ? t('fitness.parks_bad_note') : t('fitness.parks_good_note')}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {parks.map(park => (
          <li
            key={park.name}
            className="rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {locale === 'ge' ? park.nameGe : park.name}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {activityLabel(park.activity, t)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {locale === 'ge' ? park.blurbGe : park.blurb}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
