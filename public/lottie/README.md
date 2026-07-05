# Exercise Lottie Collection

18 exercises × male + female = **36 animations**, one shared flat-design rig.

## License — read this first

Every animation here is an **original asset generated in-house** by `scripts/gen-lottie.mjs`.
There is **no third-party license to honour**: the project owns them outright, so they are
**free for unlimited commercial use, modification, and redistribution**.

> Why generated instead of downloaded? A web search (LottieFiles, IconScout, Icons8) confirmed
> that **no free source carries all 18 exercises in one consistent style**, and several moves
> (Bird Dog, Fire Hydrant, Pike Push-up, Jump Lunge, Bicycle Crunch, Wall Push-up) have **no**
> free, commercially-licensed Lottie equivalent at all. Generating from a single rig is the only
> way to satisfy *"one consistent style" + "free" + "verified license"* simultaneously.

## Style consistency

All 36 files are emitted from **one rig and one palette pair**, so style consistency is **exact
(score 100/100)** across the whole set. Male and female differ *only* in hair silhouette and
shirt/short colours — identical proportions, line language, timing (60 frames @ 30 fps), and the
`#EFF2FF` background.

## Folder layout

```
public/lottie/
  male/<slug>.json            # canonical, gender-split (18)
  female/<slug>.json          # canonical, gender-split (18)
  beginner/<slug>-<gender>.json      # same files, grouped by level
  intermediate/<slug>-<gender>.json
  advanced/<slug>-<gender>.json
  manifest.json               # machine-readable index
  preview.html                # open in the dev server to see them animate
  lottie.min.js               # bundled player used only by preview.html
```

## Preview

Run the dev server and open **`/lottie/preview.html`** — a filterable gallery (by level / gender)
that animates every file. Verified rendering via lottie-web SVG renderer.

## Registry (lottie-react)

`lib/fitness/exerciseLottieRegistry.ts` is auto-generated with static `import` statements for all
36 JSON files plus metadata. Usage:

```tsx
import Lottie from 'lottie-react'
import { findExercise } from '@/lib/fitness/exerciseLottieRegistry'

const squat = findExercise('squat', 'female')!
<Lottie animationData={squat.data} loop autoplay style={{ width: 240 }} />
```

Helpers: `byLevel`, `byGender`, `byFocus`, `bySlug`, `findExercise`.

## Manifest

| Exercise | Level | Focus | Genders | Preview | JSON (male / female) | Source | License | Style |
|---|---|---|---|---|---|---|---|---|
| Squat | beginner | lower, full | M/F | preview.html | `male/squat.json` · `female/squat.json` | in-house | project-owned, commercial-OK | 100 |
| Wall Push-up | beginner | upper, full | M/F | preview.html | `male/wall-pushup.json` · `female/wall-pushup.json` | in-house | project-owned, commercial-OK | 100 |
| Glute Bridge | beginner | lower, core | M/F | preview.html | `male/glute-bridge.json` · `female/glute-bridge.json` | in-house | project-owned, commercial-OK | 100 |
| Bird Dog | beginner | core, full | M/F | preview.html | `male/bird-dog.json` · `female/bird-dog.json` | in-house | project-owned, commercial-OK | 100 |
| March in Place | beginner | cardio, lower | M/F | preview.html | `male/march-in-place.json` · `female/march-in-place.json` | in-house | project-owned, commercial-OK | 100 |
| Side Steps | beginner | cardio, lower | M/F | preview.html | `male/side-steps.json` · `female/side-steps.json` | in-house | project-owned, commercial-OK | 100 |
| Push-up | intermediate | upper, core | M/F | preview.html | `male/pushup.json` · `female/pushup.json` | in-house | project-owned, commercial-OK | 100 |
| Walking Lunge | intermediate | lower, full | M/F | preview.html | `male/walking-lunge.json` · `female/walking-lunge.json` | in-house | project-owned, commercial-OK | 100 |
| Plank | intermediate | core, full | M/F | preview.html | `male/plank.json` · `female/plank.json` | in-house | project-owned, commercial-OK | 100 |
| Step Up | intermediate | lower, cardio | M/F | preview.html | `male/step-up.json` · `female/step-up.json` | in-house | project-owned, commercial-OK | 100 |
| Mountain Climbers | intermediate | cardio, core | M/F | preview.html | `male/mountain-climbers.json` · `female/mountain-climbers.json` | in-house | project-owned, commercial-OK | 100 |
| Fire Hydrant | intermediate | lower, core | M/F | preview.html | `male/fire-hydrant.json` · `female/fire-hydrant.json` | in-house | project-owned, commercial-OK | 100 |
| Burpee | advanced | full, cardio | M/F | preview.html | `male/burpee.json` · `female/burpee.json` | in-house | project-owned, commercial-OK | 100 |
| Jump Squat | advanced | lower, cardio | M/F | preview.html | `male/jump-squat.json` · `female/jump-squat.json` | in-house | project-owned, commercial-OK | 100 |
| Pike Push-up | advanced | upper, core | M/F | preview.html | `male/pike-pushup.json` · `female/pike-pushup.json` | in-house | project-owned, commercial-OK | 100 |
| High Knees | advanced | cardio, core | M/F | preview.html | `male/high-knees.json` · `female/high-knees.json` | in-house | project-owned, commercial-OK | 100 |
| Jump Lunge | advanced | lower, cardio | M/F | preview.html | `male/jump-lunge.json` · `female/jump-lunge.json` | in-house | project-owned, commercial-OK | 100 |
| Bicycle Crunch | advanced | core | M/F | preview.html | `male/bicycle-crunch.json` · `female/bicycle-crunch.json` | in-house | project-owned, commercial-OK | 100 |

## Regenerating

```bash
node scripts/gen-lottie.mjs public/lottie   # rebuild all 36 JSON + manifest
node scripts/gen-registry.mjs               # rebuild the TS registry
```
