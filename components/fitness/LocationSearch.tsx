'use client'
import { useMemo, useState } from 'react'
import { Search, MapPin, Trees, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import { searchPlaces, type PlaceHit } from '@/lib/fitness/parks'

interface LocationSearchProps {
  /** Fires with the resolved coordinates + the label to show as the source. */
  onPick: (hit: PlaceHit) => void
}

/**
 * Type a neighbourhood, metro stop or park to set your location. Resolution is
 * local (see `TBILISI_PLACES`) — no geocoding service, no key, works offline
 * and in Georgian.
 */
export function LocationSearch({ onPick }: LocationSearchProps) {
  const { t, locale } = useLanguage()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const hits = useMemo(() => searchPlaces(query), [query])
  const showResults = open && query.trim().length >= 2

  const choose = (hit: PlaceHit) => {
    onPick(hit)
    setQuery(locale === 'ge' ? hit.nameGe : hit.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="park-location-search">
        {t('fitness.loc_search_label')}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="park-location-search"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && hits[0]) {
              e.preventDefault()
              choose(hits[0])
            }
          }}
          placeholder={t('fitness.loc_search_placeholder')}
          className="h-9 pl-9 pr-9 text-sm"
          autoComplete="off"
          role="combobox"
          aria-expanded={showResults}
          aria-controls="park-location-results"
        />
        {query && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            aria-label={t('fitness.loc_clear')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {showResults && (
        <ul
          id="park-location-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {hits.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              {t('fitness.loc_search_empty')}
            </li>
          )}
          {hits.map(hit => (
            <li key={`${hit.isPark ? 'park' : 'place'}-${hit.name}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => choose(hit)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/60"
              >
                {hit.isPark ? (
                  <Trees className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{locale === 'ge' ? hit.nameGe : hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
