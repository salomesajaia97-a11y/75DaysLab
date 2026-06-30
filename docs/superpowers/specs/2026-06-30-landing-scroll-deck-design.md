# Landing Page Redesign — Cinematic Scroll Deck

**Date:** 2026-06-30
**Status:** Approved (design phase)

## Goal

Replace the current single centered hero (`app/page.tsx`) with a full landing
experience: a snap-scroll "PowerPoint-style" deck telling a transformation arc
(Day 1 → grind → Day 75), followed by free-scrolling reveal sections and a final
CTA. Cinematic full-bleed photography (Unsplash), calm-but-dramatic, works in
light and dark themes.

## Decisions (from brainstorming)

- **Scroll model:** Hybrid — snap deck up top, free-scroll sections below.
- **Narrative:** Transformation arc.
- **Aesthetic:** Cinematic photo (full-bleed Unsplash, text overlays, parallax).
- **Image source:** Unsplash hotlinks via `next/image`.
- **Snap intensity:** Soft / escapable (`scroll-snap-type: y proximity`) — never
  traps the user; best for mobile + accessibility.

## Architecture

- `app/page.tsx` — stays a **server component**. Keeps the existing auth check
  (`auth()` → redirect `/dashboard` if signed in). Renders `<LandingExperience />`.
- `components/landing/LandingExperience.tsx` — new **client component**
  (`'use client'`). Owns scroll-snap container + framer-motion reveals. Composes
  small slide subcomponents.
- Slide subcomponents live in the same file (or `components/landing/`) — each is
  a focused, self-contained section taking `{ image, eyebrow, title, body }`-style
  props so they can be reasoned about and tweaked independently.
- `ThemeToggle` stays fixed top-right (existing component, reused).

### Why split server/client

`app/page.tsx` must run `auth()` server-side for the redirect. Scroll/motion is
client-only. Clean boundary: server page = auth + shell; client component =
interactive experience.

## Layout

### Part A — Snap deck (each slide `100vh`, `scroll-snap-align: start`)

Container: `scroll-snap-type: y proximity`, `overflow-y` scroll on the deck
wrapper (or page-level — page-level preferred so Part B participates naturally;
proximity makes trapping a non-issue).

1. **Hero** — full-bleed photo + dark gradient overlay. Eyebrow "Your challenge
   awaits", `75 Days` / *of discipline.* (Fraunces serif, existing styling).
   Primary CTA "Start your challenge" → `/register`, ghost "Sign in" → `/login`.
   Animated scroll cue at bottom.
2. **Day 1** — "Everyone starts here." Intent line. Photo of a beginning
   (sunrise/lacing shoes vibe).
3. **The grind** — daily tracking. Photo backdrop + floating glass cards for the
   four pillars: **Workouts**, **Water (liters)**, **Nutrition**, **Mindset**.
   Cards fade/stagger in via framer-motion `whileInView`.
4. **Day 75** — "Look who you became." Transformation payoff, strong photo.
5. **Proof** — social proof stat ("Join thousands building unbreakable habits")
   over photo.

### Part B — Free-scroll reveal sections

6. **Feature strip** — compact icon row (lucide-react) linking the pillars to the
   product, fade-up on view.
7. **Final CTA block** — repeat primary CTA, large, centered.
8. **Footer** — minimal (brand, year, links). 

## Tech

- **Snap:** Pure CSS — `scroll-snap-type: y proximity` on the scroll root,
  `scroll-snap-align: start` + `min-height: 100dvh` per deck slide. No JS scroll
  hijacking (avoids trackpad/a11y problems). Use `100dvh` for correct mobile vh.
- **Motion:** `framer-motion` (already a dep, in `optimizePackageImports`).
  `whileInView` + `viewport={{ once: true }}` for fade-up/stagger. Parallax via
  `useScroll`/`useTransform` on hero/photo layers — kept subtle.
- **Images:** `next/image` with Unsplash hotlinks. Add
  `{ protocol: 'https', hostname: 'images.unsplash.com' }` to
  `next.config.ts` `images.remotePatterns`. Hero image `priority`; rest lazy.
  Each image gets dark gradient overlay for text legibility in both themes.
- **Reduced motion:** Respect `prefers-reduced-motion` — disable parallax and
  convert reveals to instant. (framer-motion `useReducedMotion`.)
- **Styling:** Reuse existing CSS vars (`--background`, `--foreground`,
  `--muted-foreground`) and `.landing-btn-primary` / `.landing-btn-ghost`.
  Overlay text uses fixed light color on photos (independent of theme) since it
  sits on dark gradients.

## Out of scope (YAGNI)

- No CMS-driven slide content — copy hardcoded in the component.
- No scroll-progress dots/nav (proximity snap + short deck doesn't need it; can
  add later).
- No new image uploads / `/public` assets — Unsplash only.
- No analytics/tracking changes.

## Success criteria

- Signed-in users still redirect to `/dashboard` (auth unchanged).
- Deck reads as a 5-slide transformation story; slides snap softly and never
  trap scrolling.
- Photos load via `next/image` (no console remotePattern errors).
- Reveals animate on scroll; reduced-motion users get a static, readable page.
- Works in light + dark; CTAs route to `/register` and `/login`.
- No layout horizontal-scroll; correct on mobile (`100dvh`).
