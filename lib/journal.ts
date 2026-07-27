// Daily reflection journal — PURE domain logic (no DB, no React, no Next).
// Shared by the Mongoose model, the API routes and the client components, so
// the mood scale, field limits and the "what counts as an entry" contract are
// declared exactly once. Kept import-free of models/mongoose so client bundles
// can import it safely.

/**
 * The fixed mood scale, ordered low → high. These are the ONLY values ever
 * persisted; visible labels are localized at render time (locales/*.json under
 * `journal.mood.*`) and are never stored in the database.
 */
export const JOURNAL_MOODS = ['very_low', 'low', 'neutral', 'good', 'great'] as const
export type JournalMood = (typeof JOURNAL_MOODS)[number]

export function isJournalMood(v: unknown): v is JournalMood {
  return typeof v === 'string' && (JOURNAL_MOODS as readonly string[]).includes(v)
}

/** Maximum stored length (after trimming) for each free-text reflection field. */
export const JOURNAL_FIELD_LIMITS = {
  title: 120,
  reflection: 4000,
  gratitude: 1000,
  tomorrowFocus: 1000,
} as const

export type JournalTextField = keyof typeof JOURNAL_FIELD_LIMITS

/** The free-text fields, in the order the form presents them. */
export const JOURNAL_TEXT_FIELDS = Object.keys(JOURNAL_FIELD_LIMITS) as JournalTextField[]

/** History window bounds (trailing days ending on the user's logical today). */
export const JOURNAL_HISTORY_DEFAULT_DAYS = 30
export const JOURNAL_HISTORY_MAX_DAYS = 180

/** The reflection half of a journal entry, fully normalized (never undefined). */
export interface ReflectionDraft {
  mood: JournalMood | null
  title: string
  reflection: string
  gratitude: string
  tomorrowFocus: string
}

/** A blank draft — the canonical "empty day" value used by the UI and the API. */
export const EMPTY_REFLECTION: ReflectionDraft = {
  mood: null,
  title: '',
  reflection: '',
  gratitude: '',
  tomorrowFocus: '',
}

/**
 * Machine-readable validation codes. Routes return these as `code` alongside a
 * short generic English `error`; the client maps the code to a localized
 * message (`journal.reflection.error.<code>`). No internal DB/provider error is
 * ever surfaced.
 */
export type JournalValidationCode =
  | 'invalid_payload'
  | 'invalid_mood'
  | 'invalid_text'
  | 'too_long'
  | 'empty'
  | 'invalid_date'
  | 'future_date'

export type NormalizeResult =
  | { ok: true; value: ReflectionDraft }
  | { ok: false; code: JournalValidationCode; field?: JournalTextField }

/** True when nothing at all was recorded — no mood and no non-blank text. */
export function isReflectionEmpty(d: ReflectionDraft): boolean {
  return (
    d.mood === null &&
    !d.title.trim() &&
    !d.reflection.trim() &&
    !d.gratitude.trim() &&
    !d.tomorrowFocus.trim()
  )
}

/** Structural equality of two drafts — the dirty/unsaved check. */
export function reflectionsEqual(a: ReflectionDraft, b: ReflectionDraft): boolean {
  return (
    a.mood === b.mood &&
    a.title === b.title &&
    a.reflection === b.reflection &&
    a.gratitude === b.gratitude &&
    a.tomorrowFocus === b.tomorrowFocus
  )
}

/**
 * Coerce an arbitrary stored/returned document into a normalized draft. Unknown
 * moods and non-string text degrade to the empty value rather than throwing —
 * this is the READ path (legacy docs predate these fields).
 */
export function toReflectionDraft(source: unknown): ReflectionDraft {
  if (source === null || typeof source !== 'object') return { ...EMPTY_REFLECTION }
  const o = source as Record<string, unknown>
  const text = (k: JournalTextField) => (typeof o[k] === 'string' ? (o[k] as string) : '')
  return {
    mood: isJournalMood(o.mood) ? o.mood : null,
    title: text('title'),
    reflection: text('reflection'),
    gratitude: text('gratitude'),
    tomorrowFocus: text('tomorrowFocus'),
  }
}

/**
 * Validate + normalize an untrusted WRITE payload. Trims every text field,
 * enforces the per-field maximums (checked after trimming) and rejects a
 * completely empty entry: the chosen contract is that a save must record at
 * least a mood or some text, so blank rows are never created.
 */
export function normalizeReflection(raw: unknown): NormalizeResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'invalid_payload' }
  }
  const o = raw as Record<string, unknown>

  let mood: JournalMood | null = null
  if (o.mood != null && o.mood !== '') {
    if (!isJournalMood(o.mood)) return { ok: false, code: 'invalid_mood' }
    mood = o.mood
  }

  const value = { ...EMPTY_REFLECTION, mood }
  for (const field of JOURNAL_TEXT_FIELDS) {
    const input = o[field]
    if (input == null) continue
    if (typeof input !== 'string') return { ok: false, code: 'invalid_text', field }
    const trimmed = input.trim()
    if (trimmed.length > JOURNAL_FIELD_LIMITS[field]) return { ok: false, code: 'too_long', field }
    value[field] = trimmed
  }

  if (isReflectionEmpty(value)) return { ok: false, code: 'empty' }
  return { ok: true, value }
}

/** Single-line preview for history rows: whitespace collapsed, then truncated. */
export function reflectionPreview(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/** Clamp a `?days=` query value into [1, JOURNAL_HISTORY_MAX_DAYS]. */
export function clampHistoryDays(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw)
  if (!Number.isFinite(n)) return JOURNAL_HISTORY_DEFAULT_DAYS
  return Math.min(Math.max(Math.trunc(n), 1), JOURNAL_HISTORY_MAX_DAYS)
}
