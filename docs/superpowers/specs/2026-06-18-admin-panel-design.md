# Admin Panel — Full Design Spec
**Date:** 2026-06-18  
**Status:** Approved  
**Author:** mariamii13

---

## Overview

Extend the existing `/admin` panel with six new capability modules:
1. **Dashboard** — shadcn/recharts charts replacing current AdminDashboard
2. **Theme Editor** — live CSS variable control (colors, fonts, radius)
3. **Content Manager** — section-based per-page text editing
4. **Collections Browser** — MongoDB CRUD for operational collections, read-only for health logs
5. **Pricing Manager** — subscription plan CRUD with user assignment
6. **Stats API** — enhanced data endpoint powering dashboard charts

**Approach:** Extend `app/(admin)/admin/` — existing auth/role-gate and admin layout are reused. No parallel admin panel, no full rebuild.

---

## Data Models

### `SiteConfig` (new, singleton)

One document in the `siteconfigs` collection. Created on first admin save.

```ts
{
  _id: ObjectId,
  theme: {
    primaryColor: string,       // hex, e.g. "#6366f1"
    accentColor: string,
    backgroundColor: string,
    textColor: string,
    fontFamily: string,         // e.g. "Plus Jakarta Sans"
    fontSize: "sm" | "md" | "lg",
    borderRadius: "none" | "sm" | "md" | "lg" | "full"
  },
  updatedAt: Date,
  updatedBy: ObjectId           // ref User
}
```

CSS variable map (applied in root layout `<style>` tag):

| Field | CSS variable |
|---|---|
| primaryColor | `--primary` (HSL converted) |
| accentColor | `--accent` |
| backgroundColor | `--background` |
| textColor | `--foreground` |
| fontFamily | `--font-sans` |
| fontSize | `--base-font-size` (14px/16px/18px) |
| borderRadius | `--radius` (0/0.25rem/0.5rem/0.75rem/9999px) |

### `PageContent` (new, one per page)

```ts
{
  _id: ObjectId,
  pageId: string,               // "home" | "dashboard" | "login" | "register" | "cycle" | "nutrition" | "journal" | "water" | "fitness" | "ai" | "photos" | "squads"
  sections: [{
    sectionId: string,          // e.g. "hero", "nav", "footer", "cta"
    label: string,              // display name in admin UI
    fields: [{
      key: string,              // e.g. "title", "subtitle", "ctaText"
      label: string,            // human label in admin form
      value: string,
      type: "text" | "textarea" | "url" | "image"
    }]
  }],
  updatedAt: Date
}
```

Pages covered (12): `home`, `dashboard`, `login`, `register`, `cycle`, `nutrition`, `journal`, `water`, `fitness`, `ai`, `photos`, `squads`.

Seed script populates defaults from current hardcoded strings on first run. Admin edits values only — field definitions are code-owned (prevents layout breakage).

### `Plan` (new)

```ts
{
  _id: ObjectId,
  name: string,                 // "Free" | "Pro" | "Elite"
  slug: string,                 // "free" | "pro" | "elite" (unique)
  price: number,                // monthly, USD cents (0 = free)
  yearlyPrice: number,          // yearly, USD cents
  features: string[],           // marketing bullet list
  limits: {
    aiMessages: number,         // per day, -1 = unlimited
    photoStorage: number,       // MB, -1 = unlimited
    squadSize: number           // max members, -1 = unlimited
  },
  isActive: boolean,
  stripePriceId: string,        // optional, future Stripe integration
  createdAt: Date,
  updatedAt: Date
}
```

### `User` model — additions

Add fields:
```ts
planId: { type: ObjectId, ref: "Plan", default: null },
planAssignedAt: Date
```

---

## New Routes

### Admin UI Pages

```
app/(admin)/admin/
  page.tsx                          ← REPLACE: shadcn charts dashboard
  theme/
    page.tsx                        ← Theme + font editor
  content/
    page.tsx                        ← Page list + section picker
    [pageId]/
      page.tsx                      ← Section editor for one page
  collections/
    page.tsx                        ← Model selector list
    [model]/
      page.tsx                      ← CRUD table for one collection
  pricing/
    page.tsx                        ← Plan list + CRUD
```

### API Routes

```
app/api/admin/
  site-config/
    route.ts                        ← GET (public, needed by layout), PATCH (admin)
  page-content/
    route.ts                        ← GET all pageIds
    [pageId]/
      route.ts                      ← GET one page, PATCH sections
  collections/
    [model]/
      route.ts                      ← GET (paginated), POST
      [id]/
        route.ts                    ← GET one, PATCH, DELETE
  plans/
    route.ts                        ← GET all, POST
    [id]/
      route.ts                      ← PATCH, DELETE (guarded: no users on plan)
  stats/
    route.ts                        ← PATCH existing to add new chart data
```

---

## Module Designs

### 1. Dashboard (shadcn charts)

Top stats row (4 cards): Total Users, Active Today, Pro Users, Revenue (plan × user count).

Chart grid (2×3):

| Position | Widget | Chart | Data |
|---|---|---|---|
| 1 | User Signups Over Time | Area | `User.createdAt` grouped by day (30d) |
| 2 | Users by Plan | Donut | `User.planId` counts |
| 3 | Daily Activity | Bar | `DailyLog` count per day (14d) |
| 4 | AI Usage | Line | placeholder (OpenAI call count, future) |
| 5 | Top Challenges | Horizontal Bar | `Challenge` by participant count |
| 6 | Revenue by Plan | Stacked Bar | plan price × user count per plan |

All charts use shadcn `<ChartContainer>` wrapper with `recharts` internals. Dark/light mode via CSS variables — no hardcoded colors.

### 2. Theme Editor

Split layout:
- **Left panel** (400px): form controls
  - Color pickers: Primary, Accent, Background, Text (native `<input type="color">` with hex display)
  - Font Family: `<Select>` — Plus Jakarta Sans, Fraunces, Nunito, Noto Sans Georgian, Inter, Geist
  - Font Size: radio group (Small/Medium/Large)
  - Border Radius: radio group with visual preview dots (None/Small/Medium/Large/Full)
- **Right panel**: live preview card — fake dashboard card showing button, badge, text, input in active theme. Updates on every form change via CSS variables set on a scoped `div`.
- **Save button**: PATCH `/api/admin/site-config` → toast success/error.

Theme applied globally: root `layout.tsx` is a server component. It fetches `SiteConfig` and injects:
```html
<style>
  :root {
    --primary: <hsl-value>;
    --font-sans: "Nunito", sans-serif;
    --radius: 0.5rem;
    --base-font-size: 16px;
  }
</style>
```
This runs on every request — no rebuild, no client hydration needed for global application.

### 3. Content Manager

**List view** (`/admin/content`): cards for each of 12 pages with last-updated timestamp. Click → page editor.

**Page editor** (`/admin/content/[pageId]`):
- Breadcrumb: Content / Home
- Sections as `<Accordion>` items (shadcn Accordion)
- Each section expanded shows field rows: label on left, input/textarea on right
- Save button per section (not global save — prevents accidental bulk overwrite)
- Toast on save

**Data flow**: 
- Server component fetches `PageContent` by pageId on load
- Section form is client component, PATCH on save
- Pages consume content: server components fetch `PageContent` at request time, merge with hardcoded defaults for any missing field

**Fallback**: if `PageContent` doc missing for a page, page renders from hardcoded strings. No error.

### 4. Collections Browser

**Model list** (`/admin/collections`): two sections — "Full Access" (User, Challenge, Squad, Photo) and "Read Only" (CycleLog, DailyLog, FoodLog, WaterLog, JournalEntry). Each as a card with document count.

**Collection table** (`/admin/collections/[model]`):
- URL: `/admin/collections/user`, `/admin/collections/challenge`, etc.
- Paginated table: 20 rows/page, page controls
- Search: text input → searches key string fields (name, email, title depending on model)
- Columns: auto-derived from first document's top-level keys, max 6 columns shown, `_id` always first
- Sort: click column header toggles asc/desc

**Actions (full CRUD models)**:
- Row action: Edit → modal with auto-generated form
- Row action: Delete → confirm dialog ("Delete this document? This cannot be undone.")
- Table action: "+ New" button → same modal form, empty

**Auto-generated form**: iterates model fields, renders:
- `string` → `<Input>`
- `number` → `<Input type="number">`
- `boolean` → `<Switch>`
- `Date` → `<Input type="date">`
- `ObjectId` / nested object → `<Textarea>` (JSON)
- `string[]` → tag input

**Actions (read-only models)**:
- Row action: View → read-only modal
- Table action: Export CSV → client-side CSV from current page data

**API guards**: DELETE/PATCH routes check `model` against allowed list server-side — not just UI-gated.

### 5. Pricing Manager

**Plan list** (`/admin/pricing`): table with columns: Name, Slug, Monthly, Yearly, Features count, Active toggle, Actions.

**Actions**:
- "+ Add Plan" → modal form
- Edit → same modal pre-filled
- Delete → disabled if any `User.planId` references this plan (show tooltip: "X users on this plan")
- Active toggle → inline PATCH

**Plan form fields**:
- Name (`<Input>`)
- Slug (auto-generated from name, editable)
- Monthly price (cents → display as $X.XX)
- Yearly price (cents)
- Features (tag input — press Enter or comma to add, click × to remove)
- Limits: AI messages/day, Photo storage MB, Squad max size (number inputs, -1 = unlimited)
- Active toggle

**User plan assignment**: existing `/admin/users` page — add "Plan" column. Dropdown cell to change user's plan → PATCH `/api/admin/users/[id]` with `planId`.

---

## Error Handling

- All API routes return `{ error: string }` with appropriate HTTP status on failure
- Admin UI shows `<Alert variant="destructive">` for fetch errors
- Delete operations require explicit confirm dialog
- Plan delete guarded server-side (not just UI)
- SiteConfig GET is public (needed by layout) — returns safe defaults if no doc exists
- Collections API validates `model` param against allowlist before any DB op

---

## Security

- All `/api/admin/*` routes (except `site-config` GET) check session role === "admin" via `auth()` from NextAuth
- Collections CRUD routes validate `model` against hardcoded allowlist — no arbitrary collection access
- Delete on Plans checks user count before executing
- No raw MongoDB query injection — use Mongoose model methods only

---

## Testing Strategy

- Manual: all 6 modules exercised in browser after implementation
- Theme: verify CSS vars applied, page reload reflects saved theme
- Content: edit a field, save, navigate to actual page, verify text updated
- Collections: create/edit/delete a Challenge document end-to-end
- Pricing: add plan, assign to user, attempt delete (should be blocked)
- Dashboard charts: verify data loads, no console errors

---

## Out of Scope

- Stripe payment processing (stripePriceId field reserved for future)
- AI usage tracking (chart shows placeholder)
- Role system beyond admin/user binary
- Block editor (Notion-style drag-drop)
- Media library / image upload in content manager (url field type only)
