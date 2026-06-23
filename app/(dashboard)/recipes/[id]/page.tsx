'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import NextImage from 'next/image'
import { ArrowLeft, Flame, Clock, Users } from 'lucide-react'

interface FullRecipe {
  _id: string
  title: string
  sourceUrl: string
  sourceSite: string
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
  ingredients?: string[]
  instructions?: string[]
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<FullRecipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setRecipe(data?.recipe ?? null))
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-4 w-24 rounded" style={{ background: 'var(--muted)' }} />
        <div className="h-64 rounded-3xl" style={{ background: 'var(--muted)' }} />
        <div className="h-8 w-3/4 rounded" style={{ background: 'var(--muted)' }} />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-4 rounded" style={{ background: 'var(--muted)' }} />)}
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <p className="text-4xl">🍽️</p>
        <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Recipe not found</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--muted-foreground)' }}>
          Go back
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto py-4 pb-16 space-y-6"
    >
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to recipes
      </button>

      {/* Hero */}
      {recipe.imageUrl ? (
        <div className="relative h-64 rounded-3xl overflow-hidden">
          <NextImage
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="672px"
            priority
          />
        </div>
      ) : (
        <div
          className="h-64 rounded-3xl flex items-center justify-center text-7xl"
          style={{ background: 'var(--muted)' }}
        >
          🍽️
        </div>
      )}

      {/* Title block */}
      <div className="space-y-2">
        {recipe.category && (
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            {recipe.category}
          </p>
        )}
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
        >
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {recipe.description}
          </p>
        )}
      </div>

      {/* Stats */}
      {(recipe.calories || recipe.totalTimeMin || recipe.servings) && (
        <div
          className="flex items-center gap-5 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {recipe.calories && (
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className="h-4 w-4 text-orange-400" />
              <span style={{ color: 'var(--foreground)' }}>{recipe.calories} kcal</span>
            </div>
          )}
          {recipe.totalTimeMin && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ color: 'var(--foreground)' }}>{recipe.totalTimeMin} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ color: 'var(--foreground)' }}>{recipe.servings} servings</span>
            </div>
          )}
        </div>
      )}

      {/* Macros */}
      {(recipe.protein || recipe.carbs || recipe.fat) && (
        <div
          className="grid grid-cols-3 gap-3 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {recipe.protein !== undefined && (
            <div className="flex flex-col items-center rounded-2xl py-3" style={{ background: 'var(--muted)' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{recipe.protein}g</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Protein</span>
            </div>
          )}
          {recipe.carbs !== undefined && (
            <div className="flex flex-col items-center rounded-2xl py-3" style={{ background: 'var(--muted)' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{recipe.carbs}g</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Carbs</span>
            </div>
          )}
          {recipe.fat !== undefined && (
            <div className="flex flex-col items-center rounded-2xl py-3" style={{ background: 'var(--muted)' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{recipe.fat}g</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Fat</span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Ingredients</h2>
          <ul className="space-y-2.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--foreground)' }}>
                <span className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0 bg-orange-400" />
                {ing}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Instructions</h2>
          <ol className="space-y-5">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-4 text-sm leading-relaxed">
                <span
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  {i + 1}
                </span>
                <span style={{ color: 'var(--foreground)' }}>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Attribution — small, at bottom */}
      <p className="pt-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
        Originally from{' '}
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-70"
        >
          {recipe.sourceSite}
        </a>
      </p>
    </motion.div>
  )
}
