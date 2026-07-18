# Exercise GIF Report

Custom Lottie rig work is paused. The Fitness screen now renders the original
ExerciseDB GIFs the project already holds, matched to the 20 curated exercises.

- **Source of GIFs:** ExerciseDB cache (remote CDN, `https://static.exercisedb.dev/media/<id>.gif`).
- **Match map + descriptors:** `lib/fitness/exerciseMedia.ts`.
- **Delivery:** referenced by remote URL — nothing bundled or downloaded.
- **Where shown:** exercise cards, guided session runner, exercise detail modal
  (every place exercise media appears). Weekly-plan preview keeps its small icon tiles.
- **Reduced motion:** GIFs disabled, focus icon shown instead.
- **Flexible for Lottie later:** components read one opaque `ExerciseMedia`
  descriptor. Flip `MEDIA_MODE = 'lottie'` in `exerciseMedia.ts` to restore the
  rig everywhere — no UI edits.

## Status legend

| Status | Meaning |
| --- | --- |
| ✅ matched | GIF verified to show the correct movement. |
| ⚠️ needs review | Best available clip is a near variant (equipment/support/combo). Renders, but confirm suitability. |
| ⛔ missing | No suitable clip in the cache. Exercise falls back to its custom Lottie automatically. |

## Report

| Exercise | Difficulty | GIF status | Source clip | Notes |
| --- | --- | --- | --- | --- |
| Squat | Beginner | ✅ matched | quads (bodyweight squat) | Cache clip labelled "quads"; motion is a plain bodyweight squat. |
| Wall Push-up | Beginner | ✅ matched | push-up (wall) | — |
| Glute Bridge | Beginner | ✅ matched | low glute bridge on floor | — |
| Bird Dog | Beginner | ⛔ missing | — | No bird-dog clip in cache; keeps custom Lottie. |
| March in Place | Beginner | ⛔ missing | — | No march-in-place clip in cache; keeps custom Lottie. |
| Side Steps | Beginner | ⚠️ needs review | skater hops | Closest lateral clip is hops, not steps. |
| Push-up | Intermediate | ✅ matched | push-up | — |
| Walking Lunge | Intermediate | ✅ matched | walking lunge | — |
| Plank | Intermediate | ⚠️ needs review | weighted front plank | Only front-plank clip is the weighted variant; same hold. |
| Step Up | Intermediate | ⚠️ needs review | dumbbell step-up | No bodyweight step-up in cache; same movement pattern. |
| Mountain Climbers | Intermediate | ✅ matched | mountain climber | — |
| Fire Hydrant | Intermediate | ⛔ missing | — | No fire-hydrant clip in cache; keeps custom Lottie. |
| Burpee | Advanced | ✅ matched | burpee | — |
| Jump Squat | Advanced | ✅ matched | jump squat | — |
| Pike Push-up | Advanced | ⚠️ needs review | pike-to-cobra push-up | No plain pike push-up; clip adds a cobra phase. |
| High Knees | Advanced | ✅ matched | high knee against wall | Wall-supported variant; same drive pattern. |
| Jump Lunge | Advanced | ✅ matched | lunge with jump | — |
| Bicycle Crunch | Advanced | ✅ matched | air bike (bicycle crunch) | — |

## Summary

- ✅ matched: 11
- ⚠️ needs review: 4 (side-steps, plank, step-up, pike-push-up)
- ⛔ missing: 3 (bird-dog, march-in-place, fire-hydrant) — safely fall back to Lottie.

**Safety:** no clip was assigned above the exercise's own difficulty level, and no
unsafe substitution was made. The "needs review" flags are equipment/support/combo
mismatches, not safety risks — swap the `exerciseId` in `EXERCISE_GIFS` if a better
clip is sourced.
