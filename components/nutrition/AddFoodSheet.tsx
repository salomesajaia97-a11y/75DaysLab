'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Type, Camera, Image as ImageIcon, Star, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import type { MealType } from '@/lib/nutrition-meal'
import type { FoodEntry } from '@/types'
import type { FavoriteFood } from '@/lib/favorites'
import { useFoodLogging, type Macros } from './useFoodLogging'

type View = 'menu' | 'text' | 'camera' | 'gallery' | 'favorites'

const TILES = [
  { view: 'text' as const,      key: 'text',      Icon: Type,      bg: '#fef0e6', fg: '#f97316' },
  { view: 'camera' as const,    key: 'camera',    Icon: Camera,    bg: '#e6effe', fg: '#3b82f6' },
  { view: 'gallery' as const,   key: 'gallery',   Icon: ImageIcon, bg: '#efe9fe', fg: '#8b5cf6' },
  { view: 'favorites' as const, key: 'favorites', Icon: Star,      bg: '#e7f7ec', fg: '#22c55e' },
]

const MACRO_ACCENT = { protein: '#c07c5e', carbs: '#c5a55a', fat: '#7a9e7e' }

export interface AddFoodSheetProps {
  meal: MealType | null
  open: boolean
  onClose(): void
  onLogged(entry: FoodEntry): void
}

export function AddFoodSheet({ meal, open, onClose, onLogged }: AddFoodSheetProps) {
  const { t } = useLanguage()
  const log = useFoodLogging()
  const [view, setView] = useState<View>('menu')
  const [description, setDescription] = useState('')
  const [macros, setMacros] = useState<Macros | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [favLoading, setFavLoading] = useState(false)

  // Reset everything when the sheet (re)opens.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('menu'); setDescription(''); setMacros(null); setPhotoUrl(undefined)
      log.clearError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Load favorites lazily when that view is opened.
  useEffect(() => {
    if (view !== 'favorites') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavLoading(true)
    fetch('/api/nutrition/favorites')
      .then(r => r.ok ? r.json() : null)
      .then(d => setFavorites(d?.favorites ?? []))
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false))
  }, [view])

  if (!open || !meal) return null

  const mealLabel = t(`nutrition.meal_${meal}`)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const { macros: m, photoUrl: url } = await log.scanPhoto(file)
    if (m) { setMacros(m); setDescription(m.food ?? 'Scanned meal'); setPhotoUrl(url) }
  }

  async function handleEstimate() {
    const text = description.trim()
    if (!text) return
    const m = await log.estimateText(text)
    setMacros(m)
  }

  async function commit(desc: string, m: Macros, url?: string) {
    if (!meal) return
    const entry = await log.save({ description: desc, macros: m, meal, photoUrl: url })
    if (entry) { onLogged(entry); onClose() }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-t-3xl p-5 pb-8"
          style={{ background: 'var(--card)' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <button type="button" onClick={() => { setView('menu'); log.clearError() }} aria-label="back">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                {t('nutrition.add.title')}
              </h2>
            </div>
            <button
              type="button" onClick={onClose} aria-label="close"
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {view === 'menu' && (
            <div className="space-y-3">
              {TILES.map(({ view: v, key, Icon, bg, fg }) => (
                <button
                  key={key} type="button" onClick={() => setView(v)}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  <span className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="h-6 w-6" style={{ color: fg }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t(`recipes.add.${key}`)}</span>
                    <span className="block text-sm" style={{ color: 'var(--muted-foreground)' }}>{t(`recipes.add.${key}_desc`)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {(view === 'text' || view === 'camera' || view === 'gallery') && (
            <div className="space-y-4">
              {view === 'text' && (
                <textarea
                  rows={3} autoFocus value={description}
                  onChange={e => { setDescription(e.target.value); setMacros(null) }}
                  placeholder={t('nutrition.add.text_placeholder')}
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              )}

              {(view === 'camera' || view === 'gallery') && (
                <label
                  className="flex items-center justify-center gap-2 rounded-xl py-8 cursor-pointer text-sm"
                  style={{ background: 'var(--background)', border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {log.scanning
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('nutrition.add.scanning')}</>
                    : <>{view === 'camera' ? <Camera className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} {t(`recipes.add.${view}_desc`)}</>}
                  <input
                    type="file" accept="image/*" {...(view === 'camera' ? { capture: 'environment' as const } : {})}
                    className="hidden" onChange={e => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}

              {view === 'text' && !macros && (
                <button
                  type="button" onClick={handleEstimate} disabled={!description.trim() || log.loading}
                  className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  {log.loading && <Loader2 className="h-4 w-4 animate-spin" />} {t('nutrition.add.estimate')}
                </button>
              )}

              {macros && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium truncate">{description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-lg">{macros.calories} kcal</span>
                    <span>
                      <span style={{ color: MACRO_ACCENT.protein }}>P {macros.proteinG}g</span>{' · '}
                      <span style={{ color: MACRO_ACCENT.carbs }}>C {macros.carbsG}g</span>{' · '}
                      <span style={{ color: MACRO_ACCENT.fat }}>F {macros.fatG}g</span>
                    </span>
                  </div>
                  <button
                    type="button" onClick={() => commit(description.trim() || macros.food || 'Meal', macros, photoUrl)}
                    disabled={log.loading}
                    className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'var(--foreground)', color: 'var(--primary-foreground)' }}
                  >
                    {log.loading && <Loader2 className="h-4 w-4 animate-spin" />} {t('nutrition.add.log_to', { meal: mealLabel })}
                  </button>
                </div>
              )}

              {log.error && <p className="text-xs text-destructive">{log.error}</p>}
            </div>
          )}

          {view === 'favorites' && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {favLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!favLoading && favorites.length === 0 && (
                <p className="text-center text-sm py-6" style={{ color: 'var(--muted-foreground)' }}>{t('nutrition.add.no_favorites')}</p>
              )}
              {!favLoading && favorites.map(f => (
                <button
                  key={f.description + f.lastLoggedAt} type="button"
                  onClick={() => commit(f.description, f)}
                  disabled={log.loading}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{f.description}</span>
                    <span className="block text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      P {f.proteinG}g · C {f.carbsG}g · F {f.fatG}g
                    </span>
                  </span>
                  <span className="text-sm font-semibold flex-shrink-0 ml-3">{f.calories} kcal</span>
                </button>
              ))}
              {log.error && <p className="text-xs text-destructive">{log.error}</p>}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
