# i18n: Georgian / English Language Support

**Date:** 2026-06-02  
**Status:** Approved  

---

## Overview

Add Georgian (`ge`) and English (`en`) language support to 75DaysLab. User selects language via a switcher UI; preference persists for the current browser session only (no DB storage). No URL changes — content flips in-place.

---

## Architecture

### New files

```
locales/
  en.json                          ← all English UI strings, flat keyed
  ka.json                          ← Georgian equivalents

lib/
  i18n.ts                          ← Locale type, translation map type, useLanguage hook

components/shared/
  LanguageProvider.tsx             ← React context, sessionStorage persistence
  LanguageSwitcher.tsx             ← EN / GE pill toggle
```

### Modified files

- `app/layout.tsx` — wrap with `LanguageProvider`; bind `html[lang]` to active locale
- `components/shared/DashboardSidebar.tsx` — add `LanguageSwitcher` next to `ThemeToggle`; replace hardcoded strings with `t()`
- `app/(auth)/login/page.tsx` — add `LanguageSwitcher` top-right; translate strings
- `app/(auth)/register/page.tsx` — same as login
- `app/(onboarding)/onboarding/page.tsx` — translate strings
- All dashboard pages (`dashboard`, `fitness`, `water`, `journal`, `nutrition`, `cycle`, `photos`, `squads`) — replace hardcoded strings with `t()`

---

## LanguageProvider

```tsx
// components/shared/LanguageProvider.tsx
'use client'
```

- Reads `sessionStorage.getItem('locale')` on mount; defaults to `'en'`
- Exposes `{ locale, setLocale, t }` via context
- `t(key: string): string` — looks up key in active locale JSON; falls back to `en.json` if key missing in `ge`
- On locale change: writes to `sessionStorage`, updates `document.documentElement.lang`

---

## useLanguage hook

```ts
// lib/i18n.ts
export type Locale = 'en' | 'ge'
export function useLanguage(): { locale: Locale; setLocale: (l: Locale) => void; t: (key: string) => string }
```

---

## Translation key structure

Flat dot-notation keys grouped by feature:

| Prefix | Covers |
|--------|--------|
| `nav.*` | Sidebar navigation labels, theme, logout |
| `auth.*` | Login, register page labels and buttons |
| `onboarding.*` | Onboarding form fields and steps |
| `dashboard.*` | Greetings, task labels, stat cards |
| `fitness.*` | Fitness page |
| `water.*` | Water tracker |
| `journal.*` | Journal page |
| `nutrition.*` | Nutrition / macro page |
| `cycle.*` | Cycle calendar page |
| `photos.*` | Photos page |
| `squads.*` | Squads page |
| `common.*` | Shared: "Save", "Cancel", "Loading", etc. |

---

## LanguageSwitcher UI

Two pill buttons side by side: `EN` and `GE`. Active locale is visually highlighted (same style as active nav item: `bg-[#2d3142] text-[#f5f3ef]`). Inactive is muted.

**Placement:**
1. **Sidebar** — bottom section, same row as `ThemeToggle` (stacked below it on mobile, inline on md+)
2. **Auth pages** (login, register) — absolute top-right corner of the page

---

## Georgian Font

Current fonts (Plus Jakarta Sans, Fraunces, Nunito) are Latin-only and do not render Georgian script.

**Solution:** Add `Noto Sans Georgian` from Google Fonts as a font variable in `app/layout.tsx`. Apply it conditionally via a CSS class on `<html>` when locale is `'ge'`:

```css
.lang-ge { font-family: var(--font-noto-georgian), sans-serif; }
```

The `LanguageProvider` toggles class `lang-ge` on `document.documentElement` alongside setting `lang="ge"`.

---

## Scope

**In scope:**
- All user-visible UI strings across all pages and the sidebar
- Login, register, onboarding pages
- Georgian font loading

**Out of scope:**
- Server-side locale detection (Accept-Language header)
- URL-based locale routing (`/ge/dashboard`)
- Persisting locale to user DB profile
- RTL layout (Georgian is LTR)
- Dynamic content from DB (journal entries, squad names, etc.) — those stay in user's input language

---

## Georgian string inventory (key examples)

```json
{
  "nav.dashboard": "მთავარი",
  "nav.fitness": "ფიტნესი",
  "nav.water": "წყალი",
  "nav.journal": "დღიური",
  "nav.nutrition": "კვება",
  "nav.cycle": "ციკლი",
  "nav.photos": "ფოტოები",
  "nav.squads": "გუნდები",
  "nav.theme": "თემა",
  "nav.logout": "გამოსვლა",
  "dashboard.greeting.morning": "დილა მშვიდობისა",
  "dashboard.greeting.afternoon": "შუადღე მშვიდობისა",
  "dashboard.greeting.evening": "საღამო მშვიდობისა",
  "dashboard.subtitle": "იყავი თანმიმდევრული. ყოველი დღე მნიშვნელოვანია.",
  "common.save": "შენახვა",
  "common.cancel": "გაუქმება",
  "common.loading": "იტვირთება..."
}
```

---

## Testing checklist

- [ ] Switch to GE — all sidebar labels render in Georgian
- [ ] Switch to EN — all sidebar labels render in English  
- [ ] Refresh page — locale resets to EN (session only, not localStorage)
- [ ] Georgian text renders correctly (Noto Sans Georgian loaded)
- [ ] `html[lang]` attribute updates on switch
- [ ] Switcher appears on login and register pages
- [ ] Switcher appears in sidebar
- [ ] Missing translation key falls back to English (no crash)
