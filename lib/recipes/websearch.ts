export async function searchRecipeUrls(query: string): Promise<string[]> {
  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_ID
  if (!key || !cx) {
    console.warn('[websearch] GOOGLE_CSE_KEY/GOOGLE_CSE_ID not set — skipping web search')
    return []
  }
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=8&q=${encodeURIComponent(query + ' recipe')}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) { console.error('[websearch] CSE status', res.status); return [] }
    const data = await res.json()
    const items: Array<{ link?: string }> = data?.items ?? []
    return items.map(i => i.link).filter((l): l is string => typeof l === 'string')
  } catch (err) {
    console.error('[websearch]', err instanceof Error ? err.message : String(err))
    return []
  }
}
