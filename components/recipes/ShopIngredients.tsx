'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { RETAILER_LABELS } from '@/lib/grocery/types'
import type { MatchedIngredient, Basket } from '@/lib/grocery/types'

function hoursAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000))
}

export function ShopIngredients({ ingredients }: { ingredients: string[] }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MatchedIngredient[] | null>(null)
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [failed, setFailed] = useState(false)

  async function loadPrices() {
    setLoading(true); setFailed(false)
    try {
      const res = await fetch('/api/grocery/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })
      if (!res.ok) throw new Error('match failed')
      const data = await res.json()
      setItems(data.items); setBaskets(data.baskets)
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  const cheapest = baskets.filter(b => b.total > 0).sort((a, b) => a.total - b.total)[0]

  return (
    <section className="mt-8">
      <h2 className="text-xl mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>{t('recipes.shop_title')}</h2>

      {!items && (
        <button onClick={loadPrices} disabled={loading}
          className="rounded-lg px-4 py-2 text-sm active:scale-95 transition"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground, #fff)' }}>
          {loading ? t('recipes.shop_loading') : t('recipes.shop_cta')}
        </button>
      )}

      {failed && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_unavailable')}</p>}

      {items && (
        <>
          {cheapest && (
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_basket')}</p>
              <div className="flex flex-wrap gap-3">
                {baskets.map(b => (
                  <span key={b.retailer} className="text-sm"
                    style={{ fontWeight: b.retailer === cheapest.retailer ? 700 : 400 }}>
                    {RETAILER_LABELS[b.retailer]} {b.total > 0 ? `₾${b.total.toFixed(2)}` : '—'}
                    {b.missing.length > 0 && b.total > 0 ? ` (−${b.missing.length})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-2">
            {items.map((it, i) => {
              const m = it.matches.slice().sort((a, b) => a.price - b.price)[0]
              return (
                <li key={i} className="flex justify-between text-sm border-b py-2" style={{ borderColor: 'var(--border)' }}>
                  <span>{it.term}</span>
                  {m ? (
                    <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-right">
                      {RETAILER_LABELS[m.retailer]} · ₾{m.price.toFixed(2)}
                      <span style={{ color: 'var(--muted-foreground)' }}> · {t('recipes.shop_updated', { h: String(hoursAgo(m.scrapedAt)) })}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground)' }}>{t('recipes.shop_na')}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
