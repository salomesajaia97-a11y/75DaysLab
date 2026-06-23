'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Clock, Flame, Plus, X, Type, Camera, Image as ImageIcon, Star, RefreshCw } from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'

interface Recipe {
  _id: string
  title: string
  sourceUrl: string
  sourceSite: 'seriouseats' | 'skinnytaste' | 'allrecipes' | 'eatingwell' | 'kulinaria' | 'spruceeats'
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  cookTimeMin?: number
  prepTimeMin?: number
  totalTimeMin?: number
  servings?: number
  description?: string
  category?: string
  tags: string[]
}

type FilterKey = 'all' | '200cal' | '300cal' | '400cal' | 'protein'

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: 'all',      labelKey: 'recipes.filter.all' },
  { key: '200cal',   labelKey: 'recipes.filter.200cal' },
  { key: '300cal',   labelKey: 'recipes.filter.300cal' },
  { key: '400cal',   labelKey: 'recipes.filter.400cal' },
  { key: 'protein',  labelKey: 'recipes.filter.protein' },
]

function passesFilter(recipe: Recipe, filter: FilterKey): boolean {
  const cal = recipe.calories
  if (filter === 'all') return true
  if (filter === '200cal') return !!cal && cal <= 200
  if (filter === '300cal') return !!cal && cal > 200 && cal <= 300
  if (filter === '400cal') return !!cal && cal > 300 && cal <= 400
  if (filter === 'protein') return !!cal && cal >= 300
  return true
}

const GRADIENT_POOL = [
  'from-amber-400 to-orange-500',
  'from-green-400 to-teal-500',
  'from-pink-400 to-purple-500',
  'from-blue-300 to-indigo-400',
  'from-yellow-300 to-amber-400',
  'from-red-400 to-orange-500',
  'from-emerald-400 to-cyan-500',
  'from-rose-300 to-pink-400',
]
const EMOJI_POOL = ['🥗','🍳','🥣','🍲','🥩','🐟','🍝','🥞','🌮','🥪','🧁','🫙']

function cardGradient(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRADIENT_POOL[n % GRADIENT_POOL.length]
}
function cardEmoji(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return EMOJI_POOL[n % EMOJI_POOL.length]
}

function RecipeCard({ recipe, favorite, onToggle }: {
  recipe: Recipe
  favorite: boolean
  onToggle: () => void
}) {
  const gradient = cardGradient(recipe._id)
  const emoji = cardEmoji(recipe._id)

  return (
    <Link href={`/recipes/${recipe._id}`} className="block">
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl overflow-hidden cursor-pointer h-full"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {recipe.imageUrl ? (
          <NextImage
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-4xl">{emoji}</span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/80 flex items-center justify-center transition-all hover:bg-white z-10"
        >
          <Heart className={cn('h-3 w-3', favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-400')} />
        </button>
        <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full z-10">
          {recipe.sourceSite.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="p-2.5">
        <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: 'var(--foreground)' }}>
          {recipe.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {recipe.calories && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
              <Flame className="h-2.5 w-2.5 text-orange-400" />
              {recipe.calories}
            </span>
          )}
          {recipe.totalTimeMin && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
              <Clock className="h-2.5 w-2.5" />
              {recipe.totalTimeMin}m
            </span>
          )}
        </div>
      </div>
    </motion.div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="h-28 bg-gray-200 dark:bg-gray-700" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-2/3" />
      </div>
    </div>
  )
}

const ADD_OPTIONS = [
  { key: 'text',      labelKey: 'recipes.add.text',      descKey: 'recipes.add.text_desc',      icon: Type,      bg: 'bg-orange-100', iconBg: 'bg-orange-500' },
  { key: 'camera',    labelKey: 'recipes.add.camera',    descKey: 'recipes.add.camera_desc',    icon: Camera,    bg: 'bg-blue-100',   iconBg: 'bg-blue-500' },
  { key: 'gallery',   labelKey: 'recipes.add.gallery',   descKey: 'recipes.add.gallery_desc',   icon: ImageIcon, bg: 'bg-purple-100', iconBg: 'bg-purple-500' },
  { key: 'favorites', labelKey: 'recipes.add.favorites', descKey: 'recipes.add.favorites_desc', icon: Star,      bg: 'bg-green-100',  iconBg: 'bg-green-500' },
]

type GroupedRecipes = { label: string; site: string; recipes: Recipe[] }[]

const SITE_LABELS: Record<string, string> = {
  seriouseats: 'Serious Eats',
  skinnytaste: 'Skinnytaste',
  allrecipes:  'AllRecipes',
  eatingwell:  'Eating Well',
  kulinaria:   'Kulinaria',
  spruceeats:  'The Spruce Eats',
}

function groupBySite(recipes: Recipe[]): GroupedRecipes {
  const map = new Map<string, Recipe[]>()
  for (const r of recipes) {
    if (!map.has(r.sourceSite)) map.set(r.sourceSite, [])
    map.get(r.sourceSite)!.push(r)
  }
  return Array.from(map.entries()).map(([site, recs]) => ({
    label: SITE_LABELS[site] ?? site,
    site,
    recipes: recs,
  }))
}

export default function RecipesPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ saved: number; skipped: number } | null>(null)
  const [portalMounted, setPortalMounted] = useState(false)

  useEffect(() => { setPortalMounted(true) }, [])

  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.ok ? r.json() : { recipes: [] })
      .then(data => setRecipes(data.recipes ?? []))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh every 60s to pick up cron-scraped recipes
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/recipes')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setRecipes(data.recipes ?? []) })
        .catch(() => {})
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function triggerScrape(site: string = 'skinnytaste') {
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/recipes/scrape', { method: 'POST', body: JSON.stringify({ site }), headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setScrapeResult({ saved: data.saved, skipped: data.skipped })
      const r = await fetch('/api/recipes').then(r => r.json())
      setRecipes(r.recipes ?? [])
    } catch { /* ignore */ }
    finally { setScraping(false) }
  }

  const filtered = recipes.filter(r => passesFilter(r, filter))
  const groups = groupBySite(filtered)
  const featured = recipes[0]

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-4xl font-bold tracking-tight leading-none" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
          {t('recipes.title')}
        </h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => triggerScrape('skinnytaste')}
                disabled={scraping}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                title="Scrape SkinnyTaste recipes"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', scraping && 'animate-spin')} />
                SkinnyTaste
              </button>
              <button
                onClick={() => triggerScrape('allrecipes')}
                disabled={scraping}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                title="Scrape AllRecipes recipes"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', scraping && 'animate-spin')} />
                AllRecipes
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('recipes.add_dish')}</span>
          </button>
        </div>
      </div>

      {/* Scrape result toast */}
      <AnimatePresence>
        {scrapeResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl px-4 py-3 text-sm font-medium"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            ✓ Scraped: {scrapeResult.saved} new, {scrapeResult.skipped} already saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured banner */}
      {featured && (
        <Link href={`/recipes/${featured._id}`}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`relative rounded-3xl overflow-hidden h-48 block cursor-pointer bg-gradient-to-br ${cardGradient(featured._id)}`}
        >
          {featured.imageUrl && (
            <NextImage src={featured.imageUrl} alt={featured.title} fill className="object-cover" sizes="(max-width: 896px) 100vw, 896px" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-5">
            <p className="text-xs text-white/70 mb-1">{t('recipes.featured')}</p>
            <h2 className="text-2xl font-bold text-white leading-tight line-clamp-2">{featured.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              {featured.calories && (
                <span className="flex items-center gap-1 text-white/80 text-sm">
                  <Flame className="h-3.5 w-3.5" /> {featured.calories} {t('recipes.kcal')}
                </span>
              )}
              {featured.totalTimeMin && (
                <span className="flex items-center gap-1 text-white/80 text-sm">
                  <Clock className="h-3.5 w-3.5" /> {featured.totalTimeMin} {t('recipes.min')}
                </span>
              )}
              <span className="text-white/60 text-xs ml-auto">{featured.sourceSite}</span>
            </div>
          </div>
        </motion.div>
        </Link>
      )}

      {/* Empty state — no recipes yet */}
      {!loading && recipes.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">🍽️</p>
          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>No recipes yet</p>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {isAdmin ? 'Click "Scrape" to pull recipes from SeriousEats & Skinnytaste.' : 'Recipes coming soon.'}
          </p>
        </div>
      )}

      {/* Filter pills */}
      {recipes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn('flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all', filter === f.key ? 'text-white shadow-sm' : 'border')}
              style={filter === f.key ? { background: 'var(--primary)' } : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-6">
          {[0, 1].map(i => (
            <div key={i}>
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[0, 1, 2, 3, 4, 5].map(j => <SkeletonCard key={j} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe groups */}
      {!loading && groups.map((group, i) => (
        <motion.section
          key={group.site}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--foreground)' }}>
              {group.label}
            </h3>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{group.recipes.length} recipes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {group.recipes.map(recipe => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                favorite={favorites.has(recipe._id)}
                onToggle={() => toggleFavorite(recipe._id)}
              />
            ))}
          </div>
        </motion.section>
      ))}

      {/* Add Dish Modal — rendered at document.body to escape any stacking context */}
      {portalMounted && createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm rounded-3xl p-6"
                style={{
                  background: 'var(--card, #ffffff)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('recipes.add_dish')}</h2>
                  <button onClick={() => setShowAddModal(false)} className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:opacity-70" style={{ background: 'var(--muted)' }}>
                    <X className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                </div>
                <div className="space-y-3">
                  {ADD_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    return (
                      <motion.button
                        key={opt.key}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl ${opt.bg}`}
                        onClick={() => setShowAddModal(false)}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{t(opt.labelKey)}</p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t(opt.descKey)}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center sm:hidden transition-all active:scale-95 z-30"
        style={{ background: 'var(--primary)' }}
      >
        <Plus className="h-6 w-6" style={{ color: 'var(--primary-foreground)' }} />
      </button>
    </div>
  )
}
