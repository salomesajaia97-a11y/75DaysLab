'use client'
import { useCallback, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  MAP_DISTRICTS,
  MAP_ROADS,
  MAP_VIEW,
  MTKVARI_PATH,
  project,
  unproject,
  type LatLon,
  type TbilisiPark,
} from '@/lib/fitness/parks'

// Teardrop pin drawn tip-down at (0,0); scaled at use site.
const PIN_PATH =
  'M0 0 C-3.2 -4.2 -4.6 -5.6 -4.6 -8.2 A4.6 4.6 0 0 1 4.6 -8.2 C4.6 -5.6 3.2 -4.2 0 0 Z'

function toPoints(path: LatLon[]): string {
  return path
    .map(p => {
      const { x, y } = project(p)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

/** Keep edge labels inside the frame. */
function anchorFor(x: number): 'start' | 'middle' | 'end' {
  if (x < 14) return 'start'
  if (x > 86) return 'end'
  return 'middle'
}

interface ParkMapProps {
  parks: TbilisiPark[]
  /** Currently chosen spot (drives the walk timer). */
  selectedSlug: string | null
  /** Weather + location pick — gets the custom highlighted pin. */
  recommendedSlug: string | null
  /** Runners-up on the shortlist — ringed, so the options read at a glance. */
  alternateSlugs?: string[]
  userLoc: LatLon | null
  /** While true, a click anywhere on the map sets the user's location. */
  pickMode: boolean
  onPickLocation: (loc: LatLon) => void
  onSelectPark: (slug: string) => void
}

/**
 * Self-contained stylised map of Tbilisi — no tile provider, no external
 * requests. Parks are projected from real coordinates (see `parks.ts`), so
 * click-to-locate and the distance readouts share one coordinate space.
 */
export function ParkMap({
  parks,
  selectedSlug,
  recommendedSlug,
  alternateSlugs = [],
  userLoc,
  pickMode,
  onPickLocation,
  onSelectPark,
}: ParkMapProps) {
  const { t, locale } = useLanguage()
  const svgRef = useRef<SVGSVGElement>(null)

  // The wrapper's aspect ratio matches the viewBox, so a plain rect-relative
  // fraction maps 1:1 onto viewBox units.
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!pickMode || !svgRef.current) return
      const r = svgRef.current.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const x = ((e.clientX - r.left) / r.width) * MAP_VIEW.w
      const y = ((e.clientY - r.top) / r.height) * MAP_VIEW.h
      onPickLocation(unproject(x, y))
    },
    [pickMode, onPickLocation],
  )

  const user = userLoc ? project(userLoc) : null

  return (
    <div
      className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl border border-border sm:max-w-[300px]"
      style={{ aspectRatio: `${MAP_VIEW.w} / ${MAP_VIEW.h}` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
        className={`h-full w-full ${pickMode ? 'cursor-crosshair' : ''}`}
        onClick={handleClick}
        role="img"
        aria-label={t('fitness.map_aria')}
      >
        <defs>
          <linearGradient id="pm-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.18" />
            <stop offset="55%" stopColor="var(--card)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.16" />
          </linearGradient>
          <radialGradient id="pm-green" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.18" />
          </radialGradient>
          <radialGradient id="pm-water" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="url(#pm-bg)" />

        {/* faint street grid */}
        <g stroke="var(--border)" strokeWidth="0.25" opacity="0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={MAP_VIEW.h} />
          ))}
          {Array.from({ length: 9 }, (_, i) => {
            const y = ((i + 1) * MAP_VIEW.h) / 10
            return <line key={`h${i}`} x1="0" y1={y} x2={MAP_VIEW.w} y2={y} />
          })}
        </g>

        {/* Mtkvari */}
        <polyline
          points={toPoints(MTKVARI_PATH)}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="3.4"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={toPoints(MTKVARI_PATH)}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* avenue hints */}
        <g fill="none" stroke="var(--background)" strokeOpacity="0.85" strokeLinecap="round">
          {MAP_ROADS.map((road, i) => (
            <polyline key={i} points={toPoints(road)} strokeWidth="1.4" />
          ))}
        </g>

        {/* district / river labels */}
        <g
          fill="var(--muted-foreground)"
          fillOpacity="0.65"
          fontSize="2.6"
          letterSpacing="0.25"
          textAnchor="middle"
        >
          {MAP_DISTRICTS.map(d => {
            const { x, y } = project(d)
            return (
              <text key={d.name} x={x} y={y} textAnchor={anchorFor(x)}>
                {locale === 'ge' ? d.nameGe : d.name}
              </text>
            )
          })}
        </g>

        {/* park footprints */}
        <g>
          {parks.map(p => {
            const { x, y } = project(p)
            const r = Math.min(3.2 + p.loopKm * 0.85, 7.5)
            return (
              <circle
                key={`blob-${p.slug}`}
                cx={x}
                cy={y}
                r={r}
                fill={p.water ? 'url(#pm-water)' : 'url(#pm-green)'}
              />
            )
          })}
        </g>

        {/* user location */}
        {user && (
          <g>
            <circle cx={user.x} cy={user.y} r="2" fill="var(--primary)" fillOpacity="0.35">
              <animate attributeName="r" values="2;6.5" dur="2.4s" repeatCount="indefinite" />
              <animate
                attributeName="fill-opacity"
                values="0.4;0"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={user.x}
              cy={user.y}
              r="2.1"
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth="0.9"
            />
            <text
              x={user.x}
              y={user.y - 3.6}
              fontSize="2.8"
              fontWeight="600"
              fill="var(--foreground)"
              textAnchor={anchorFor(user.x)}
            >
              {t('fitness.map_you')}
            </text>
          </g>
        )}

        {/* park markers */}
        {parks.map(p => {
          const { x, y } = project(p)
          const isRec = p.slug === recommendedSlug
          const isSel = p.slug === selectedSlug
          const isAlt = alternateSlugs.includes(p.slug)
          const label = locale === 'ge' ? p.mapLabelGe : p.mapLabel
          return (
            <g
              key={p.slug}
              role="button"
              tabIndex={0}
              aria-label={locale === 'ge' ? p.nameGe : p.name}
              aria-pressed={isSel}
              className="cursor-pointer outline-none"
              onClick={e => {
                if (pickMode) return
                e.stopPropagation()
                onSelectPark(p.slug)
              }}
              onKeyDown={e => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                onSelectPark(p.slug)
              }}
            >
              {isRec ? (
                <>
                  {/* custom pin dropped on the recommended spot */}
                  <ellipse cx={x} cy={y + 0.6} rx="2.6" ry="0.9" fill="var(--foreground)" fillOpacity="0.14" />
                  <g transform={`translate(${x} ${y}) scale(0.55)`}>
                    <path
                      d={PIN_PATH}
                      fill="var(--primary)"
                      stroke="var(--background)"
                      strokeWidth="0.9"
                    />
                    <circle cx="0" cy="-8.2" r="1.9" fill="var(--background)" />
                  </g>
                  <circle
                    cx={x}
                    cy={y - 4.5}
                    r="4"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="0.5"
                    strokeOpacity="0.5"
                  >
                    <animate attributeName="r" values="4;7" dur="2.4s" repeatCount="indefinite" />
                    <animate
                      attributeName="stroke-opacity"
                      values="0.5;0"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              ) : (
                <>
                  {isAlt && (
                    <circle
                      cx={x}
                      cy={y}
                      r="3.4"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="0.5"
                      strokeOpacity="0.45"
                      strokeDasharray="1.6 1.2"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSel ? 2.2 : 1.6}
                    fill={isSel ? 'var(--primary)' : 'var(--background)'}
                    stroke={isSel ? 'var(--background)' : 'var(--primary)'}
                    strokeWidth="0.8"
                  />
                </>
              )}
              {/* Fifteen labels at this size would be soup — only the pin and
                  the chosen spot are named; the rest answer on hover/focus. */}
              <title>{locale === 'ge' ? p.nameGe : p.name}</title>
              {(isRec || isSel || isAlt) && (
                <text
                  x={x + (p.labelDx ?? 0)}
                  y={y + (p.labelDy ?? (isRec ? 4.4 : 5))}
                  fontSize={isRec || isSel ? 3.4 : 3}
                  fontWeight={isRec || isSel ? 700 : 500}
                  fill="var(--foreground)"
                  fillOpacity={isRec || isSel ? 1 : 0.75}
                  textAnchor={p.labelAnchor ?? anchorFor(x)}
                  className="pointer-events-none select-none"
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {pickMode && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-xl bg-background/85 px-3 py-1.5 text-center text-[11px] font-medium text-foreground/80 backdrop-blur">
          {t('fitness.map_pick_hint')}
        </div>
      )}
    </div>
  )
}
