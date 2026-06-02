# i18n Georgian / English Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Georgian (`ge`) and English (`en`) language support with a session-persisted language switcher on all pages.

**Architecture:** Custom React context (`LanguageProvider`) wraps the app, reads/writes `sessionStorage`, and exposes `t(key)` for string lookup. Two JSON files (`locales/en.json`, `locales/ge.json`) hold all UI strings. `LanguageSwitcher` renders EN/GE pill buttons placed in the sidebar and on auth pages.

**Tech Stack:** React context, sessionStorage, Next.js App Router, Google Fonts (Noto Sans Georgian), Tailwind CSS.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `locales/en.json` | All English UI strings |
| Create | `locales/ge.json` | All Georgian UI strings |
| Create | `lib/i18n.ts` | `Locale` type + `LanguageContext` creation |
| Create | `components/shared/LanguageProvider.tsx` | Context provider + sessionStorage + font class |
| Create | `components/shared/LanguageSwitcher.tsx` | EN/GE pill toggle component |
| Modify | `app/layout.tsx` | Add Noto Sans Georgian font + wrap with `LanguageProvider` |
| Modify | `components/shared/DashboardSidebar.tsx` | Add `LanguageSwitcher`, translate nav labels |
| Modify | `app/(auth)/login/page.tsx` | Add `LanguageSwitcher`, translate strings |
| Modify | `app/(auth)/register/page.tsx` | Add `LanguageSwitcher`, translate strings |
| Modify | `app/(onboarding)/onboarding/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/dashboard/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/fitness/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/water/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/journal/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/nutrition/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/cycle/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/photos/page.tsx` | Translate all strings |
| Modify | `app/(dashboard)/squads/page.tsx` | Translate all strings |

---

## Task 1: Create translation JSON files

**Files:**
- Create: `locales/en.json`
- Create: `locales/ge.json`

- [ ] **Step 1: Create `locales/en.json`**

```json
{
  "nav.dashboard": "Dashboard",
  "nav.fitness": "Fitness",
  "nav.water": "Water",
  "nav.journal": "Journal",
  "nav.nutrition": "Nutrition",
  "nav.cycle": "Cycle",
  "nav.photos": "Photos",
  "nav.squads": "Squads",
  "nav.theme": "Theme",
  "nav.logout": "Log out",

  "auth.login.title": "Welcome back",
  "auth.login.description": "Sign in to your 75DaysLab account",
  "auth.login.email": "Email",
  "auth.login.password": "Password",
  "auth.login.submit": "Sign In",
  "auth.login.google": "Continue with Google",
  "auth.login.no_account": "No account?",
  "auth.login.create_one": "Create one",
  "auth.login.error": "Invalid email or password",
  "auth.login.or": "or",

  "auth.register.title": "Create account",
  "auth.register.description": "Start your 75-day challenge today",
  "auth.register.username": "Username",
  "auth.register.email": "Email",
  "auth.register.password": "Password",
  "auth.register.submit": "Create Account",
  "auth.register.google": "Sign up with Google",
  "auth.register.has_account": "Already have an account?",
  "auth.register.sign_in": "Sign in",
  "auth.register.error_short_password": "Password must be at least 8 characters",
  "auth.register.error_failed": "Registration failed. Please try again.",
  "auth.register.or": "or",

  "onboarding.step_of": "Step {current} of {total}",
  "onboarding.profile.title": "Tell us about yourself",
  "onboarding.goals.title": "What's your goal?",
  "onboarding.focus.title": "Your biggest challenge?",
  "onboarding.timeline.title": "Set your timeline",
  "onboarding.profile.age": "Age",
  "onboarding.profile.gender": "Gender",
  "onboarding.profile.height": "Height (cm)",
  "onboarding.profile.weight": "Weight (kg)",
  "onboarding.profile.female": "Female",
  "onboarding.profile.male": "Male",
  "onboarding.profile.other": "Other",
  "onboarding.goals.lose_label": "Lose Weight",
  "onboarding.goals.lose_desc": "Caloric deficit, fat loss focus",
  "onboarding.goals.gain_label": "Gain Muscle",
  "onboarding.goals.gain_desc": "Caloric surplus, protein priority",
  "onboarding.goals.maintain_label": "Maintain",
  "onboarding.goals.maintain_desc": "Balanced macros, body recomp",
  "onboarding.focus.nutrition": "Nutrition",
  "onboarding.focus.workout": "Workout",
  "onboarding.focus.sleep": "Sleep",
  "onboarding.focus.other": "Other",
  "onboarding.timeline.start_date": "Start Date",
  "onboarding.timeline.total_days": "Total Days",
  "onboarding.timeline.total_days_hint": "(default 75)",
  "onboarding.back": "Back",
  "onboarding.continue": "Continue",
  "onboarding.start": "Start Challenge",
  "onboarding.error_save": "Failed to save. Please try again.",

  "dashboard.greeting.morning": "Good morning",
  "dashboard.greeting.afternoon": "Good afternoon",
  "dashboard.greeting.evening": "Good evening",
  "dashboard.subtitle": "Stay consistent. Every day counts.",
  "dashboard.day_complete": "Day complete!",
  "dashboard.progress": "Daily Progress",
  "dashboard.tasks_count": "{done}/{total} tasks",
  "dashboard.hydration": "Hydration",
  "dashboard.todays_tasks": "Today's Tasks",
  "dashboard.task.water": "Drink daily water goal",
  "dashboard.task.journal": "Read 10 pages",
  "dashboard.task.workout": "Complete workout",
  "dashboard.task.nutrition": "Log all meals",
  "dashboard.task.photo": "Upload progress photo",
  "dashboard.stat.streak": "Current Streak",
  "dashboard.stat.day": "Challenge Day",
  "dashboard.stat.days_left": "Days Left",
  "dashboard.stat.streak_value": "{n} day",
  "dashboard.stat.streak_value_plural": "{n} days",
  "dashboard.stat.day_value": "Day {n}",
  "dashboard.stat.days_left_value": "{n} days",

  "fitness.title": "Fitness",
  "fitness.subtitle": "Your 75 Hard workout progress",
  "fitness.today": "Today",
  "fitness.indoor": "Indoor",
  "fitness.outdoor": "Outdoor",
  "fitness.min": "45 min",
  "fitness.done": "Completed today",
  "fitness.not_done": "Not done yet",
  "fitness.this_week": "This Week",
  "fitness.dot_legend": "Top dot = indoor · Bottom dot = outdoor",
  "fitness.stat.sessions": "Sessions This Week",
  "fitness.stat.full_days": "Full Days This Week",
  "fitness.stat.completion": "Completion Rate",

  "water.title": "Hydration Tracker",
  "water.card_title": "Today's Water Intake",
  "water.goal_desc": "Daily goal: {ml} ml — calculated from your profile",

  "journal.title": "Reading & Journal",
  "journal.card_title": "Today's Reading",

  "nutrition.title": "Nutrition",
  "nutrition.today": "Today",
  "nutrition.daily_macros": "Daily Macros",
  "nutrition.log_meal": "Log a Meal",
  "nutrition.todays_log": "Today's Log",

  "cycle.title": "Cycle Tracker",
  "cycle.card_title": "Menstrual Calendar",

  "photos.title": "Progress Photos",
  "photos.tab.upload": "Upload Today",
  "photos.tab.compare": "Compare",
  "photos.tab.vault": "Vault",
  "photos.day_photo": "Day {n} Photo",
  "photos.day_saved": "Day {n} photo saved",
  "photos.compare_title": "Side-by-Side Comparison",
  "photos.before": "Before (Day)",
  "photos.after": "After (Day)",
  "photos.vault_title": "All Photos ({n})",
  "photos.empty": "No photos uploaded yet. Start with Day 1!",
  "photos.day_label": "Day {n}",

  "squads.title": "Squads",
  "squads.join": "Join",
  "squads.create": "Create",
  "squads.join_dialog_title": "Join a Squad",
  "squads.join_code_label": "Squad Code",
  "squads.join_submit": "Join Squad",
  "squads.create_dialog_title": "Create a Squad",
  "squads.create_name_label": "Squad Name",
  "squads.create_submit": "Create Squad",
  "squads.leaderboard": "Leaderboard",
  "squads.empty": "No squads yet. Create one or join with a code.",
  "squads.back": "← Back",

  "common.loading": "Loading...",
  "common.save": "Save",
  "common.cancel": "Cancel"
}
```

- [ ] **Step 2: Create `locales/ge.json`**

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

  "auth.login.title": "კეთილი იყოს დაბრუნება",
  "auth.login.description": "შედი 75DaysLab-ში",
  "auth.login.email": "ელ-ფოსტა",
  "auth.login.password": "პაროლი",
  "auth.login.submit": "შესვლა",
  "auth.login.google": "Google-ით შესვლა",
  "auth.login.no_account": "არ გაქვს ანგარიში?",
  "auth.login.create_one": "შექმენი",
  "auth.login.error": "არასწორი ელ-ფოსტა ან პაროლი",
  "auth.login.or": "ან",

  "auth.register.title": "ანგარიშის შექმნა",
  "auth.register.description": "დაიწყე 75-დღიანი გამოწვევა",
  "auth.register.username": "მომხმარებლის სახელი",
  "auth.register.email": "ელ-ფოსტა",
  "auth.register.password": "პაროლი",
  "auth.register.submit": "ანგარიშის შექმნა",
  "auth.register.google": "Google-ით რეგისტრაცია",
  "auth.register.has_account": "უკვე გაქვს ანგარიში?",
  "auth.register.sign_in": "შესვლა",
  "auth.register.error_short_password": "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს",
  "auth.register.error_failed": "რეგისტრაცია ვერ მოხდა. სცადე თავიდან.",
  "auth.register.or": "ან",

  "onboarding.step_of": "ნაბიჯი {current} / {total}",
  "onboarding.profile.title": "მოგვიყევი შენს შესახებ",
  "onboarding.goals.title": "რა არის შენი მიზანი?",
  "onboarding.focus.title": "შენი მთავარი გამოწვევა?",
  "onboarding.timeline.title": "დააყენე ვადები",
  "onboarding.profile.age": "ასაკი",
  "onboarding.profile.gender": "სქესი",
  "onboarding.profile.height": "სიმაღლე (სმ)",
  "onboarding.profile.weight": "წონა (კგ)",
  "onboarding.profile.female": "მდედრი",
  "onboarding.profile.male": "მამრი",
  "onboarding.profile.other": "სხვა",
  "onboarding.goals.lose_label": "წონის დაკლება",
  "onboarding.goals.lose_desc": "კალორიური დეფიციტი, ცხიმის წვა",
  "onboarding.goals.gain_label": "კუნთების მომატება",
  "onboarding.goals.gain_desc": "კალორიული პლუსი, ცილა პრიორიტეტი",
  "onboarding.goals.maintain_label": "შენარჩუნება",
  "onboarding.goals.maintain_desc": "დაბალანსებული მაკრო",
  "onboarding.focus.nutrition": "კვება",
  "onboarding.focus.workout": "ვარჯიში",
  "onboarding.focus.sleep": "ძილი",
  "onboarding.focus.other": "სხვა",
  "onboarding.timeline.start_date": "დაწყების თარიღი",
  "onboarding.timeline.total_days": "სულ დღეები",
  "onboarding.timeline.total_days_hint": "(ნაგულისხმევი 75)",
  "onboarding.back": "უკან",
  "onboarding.continue": "გაგრძელება",
  "onboarding.start": "გამოწვევის დაწყება",
  "onboarding.error_save": "შენახვა ვერ მოხდა. სცადე თავიდან.",

  "dashboard.greeting.morning": "დილა მშვიდობისა",
  "dashboard.greeting.afternoon": "შუადღე მშვიდობისა",
  "dashboard.greeting.evening": "საღამო მშვიდობისა",
  "dashboard.subtitle": "იყავი თანმიმდევრული. ყოველი დღე მნიშვნელოვანია.",
  "dashboard.day_complete": "დღე დასრულდა!",
  "dashboard.progress": "დღის პროგრესი",
  "dashboard.tasks_count": "{done}/{total} დავალება",
  "dashboard.hydration": "დატენვა",
  "dashboard.todays_tasks": "დღის დავალებები",
  "dashboard.task.water": "დალიე დღიური წყლის ნორმა",
  "dashboard.task.journal": "წაიკითხე 10 გვერდი",
  "dashboard.task.workout": "დაასრულე ვარჯიში",
  "dashboard.task.nutrition": "შეიყვანე ყველა კვება",
  "dashboard.task.photo": "ატვირთე პროგრეს ფოტო",
  "dashboard.stat.streak": "მიმდინარე სერია",
  "dashboard.stat.day": "გამოწვევის დღე",
  "dashboard.stat.days_left": "დარჩენილი დღეები",
  "dashboard.stat.streak_value": "{n} დღე",
  "dashboard.stat.streak_value_plural": "{n} დღე",
  "dashboard.stat.day_value": "დღე {n}",
  "dashboard.stat.days_left_value": "{n} დღე",

  "fitness.title": "ფიტნესი",
  "fitness.subtitle": "შენი 75 Hard-ის ვარჯიშის პროგრესი",
  "fitness.today": "დღეს",
  "fitness.indoor": "შიდა",
  "fitness.outdoor": "გარე",
  "fitness.min": "45 წუთი",
  "fitness.done": "დასრულდა დღეს",
  "fitness.not_done": "ჯერ არ გაკეთებულა",
  "fitness.this_week": "ეს კვირა",
  "fitness.dot_legend": "ზედა წერტილი = შიდა · ქვედა წერტილი = გარე",
  "fitness.stat.sessions": "სესია ამ კვირაში",
  "fitness.stat.full_days": "სრული დღეები ამ კვირაში",
  "fitness.stat.completion": "შესრულების მაჩვენებელი",

  "water.title": "ჰიდრატაციის ტრეკერი",
  "water.card_title": "დღევანდელი წყლის მოხმარება",
  "water.goal_desc": "დღიური ნორმა: {ml} მლ — გამოთვლილია შენი პროფილიდან",

  "journal.title": "კითხვა და დღიური",
  "journal.card_title": "დღევანდელი კითხვა",

  "nutrition.title": "კვება",
  "nutrition.today": "დღეს",
  "nutrition.daily_macros": "დღიური მაკრო",
  "nutrition.log_meal": "კვების შეყვანა",
  "nutrition.todays_log": "დღის ჩანაწერი",

  "cycle.title": "ციკლის ტრეკერი",
  "cycle.card_title": "მენსტრუაციის კალენდარი",

  "photos.title": "პროგრეს ფოტოები",
  "photos.tab.upload": "დღეს ატვირთე",
  "photos.tab.compare": "შედარება",
  "photos.tab.vault": "საცავი",
  "photos.day_photo": "დღე {n} ფოტო",
  "photos.day_saved": "✓ დღე {n} ფოტო შენახულია",
  "photos.compare_title": "გვერდ-გვერდ შედარება",
  "photos.before": "ადრე (დღე)",
  "photos.after": "შემდეგ (დღე)",
  "photos.vault_title": "ყველა ფოტო ({n})",
  "photos.empty": "ჯერ ფოტო არ არის. დაიწყე პირველი დღიდან!",
  "photos.day_label": "დღე {n}",

  "squads.title": "გუნდები",
  "squads.join": "შეერთება",
  "squads.create": "შექმნა",
  "squads.join_dialog_title": "გუნდში შეერთება",
  "squads.join_code_label": "გუნდის კოდი",
  "squads.join_submit": "გუნდში შეერთება",
  "squads.create_dialog_title": "გუნდის შექმნა",
  "squads.create_name_label": "გუნდის სახელი",
  "squads.create_submit": "გუნდის შექმნა",
  "squads.leaderboard": "ლიდერბორდი",
  "squads.empty": "ჯერ გუნდი არ არის. შექმენი ან შეუერთდი კოდით.",
  "squads.back": "← უკან",

  "common.loading": "იტვირთება...",
  "common.save": "შენახვა",
  "common.cancel": "გაუქმება"
}
```

- [ ] **Step 3: Commit**

```bash
git add locales/en.json locales/ge.json
git commit -m "feat: add i18n translation files (en + ge)"
```

---

## Task 2: Create i18n context and LanguageProvider

**Files:**
- Create: `lib/i18n.ts`
- Create: `components/shared/LanguageProvider.tsx`

- [ ] **Step 1: Create `lib/i18n.ts`**

```ts
import { createContext, useContext } from 'react'

export type Locale = 'en' | 'ge'

export interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function useLanguage() {
  return useContext(LanguageContext)
}
```

- [ ] **Step 2: Create `components/shared/LanguageProvider.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Locale } from '@/lib/i18n'
import { LanguageContext } from '@/lib/i18n'
import en from '@/locales/en.json'
import ge from '@/locales/ge.json'

const translations: Record<Locale, Record<string, string>> = { en, ge }

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = sessionStorage.getItem('locale') as Locale | null
    if (saved === 'en' || saved === 'ge') {
      setLocaleState(saved)
      document.documentElement.lang = saved
      document.documentElement.classList.toggle('lang-ge', saved === 'ge')
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    sessionStorage.setItem('locale', l)
    document.documentElement.lang = l
    document.documentElement.classList.toggle('lang-ge', l === 'ge')
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const str = translations[locale][key] ?? translations['en'][key] ?? key
    return interpolate(str, vars)
  }, [locale])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/i18n.ts components/shared/LanguageProvider.tsx
git commit -m "feat: add LanguageProvider and useLanguage hook"
```

---

## Task 3: Create LanguageSwitcher component

**Files:**
- Create: `components/shared/LanguageSwitcher.tsx`

- [ ] **Step 1: Create `components/shared/LanguageSwitcher.tsx`**

```tsx
'use client'
import { useLanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage()

  return (
    <div className={cn('flex gap-1', className)}>
      {(['en', 'ge'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-semibold uppercase transition-all duration-200',
            locale === l
              ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
              : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/LanguageSwitcher.tsx
git commit -m "feat: add LanguageSwitcher EN/GE pill component"
```

---

## Task 4: Wire up layout — Noto Sans Georgian font + LanguageProvider

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/layout.tsx` with:**

```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces, Nunito, Noto_Sans_Georgian } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { LanguageProvider } from '@/components/shared/LanguageProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-noto-georgian',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '75DaysLab',
  description: 'Your customizable 75-day challenge tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} ${nunito.variable} ${notoGeorgian.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <SessionProvider>{children}</SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Add Georgian font CSS rule to `app/globals.css`**

Open `app/globals.css` and append at the end:

```css
.lang-ge {
  font-family: var(--font-noto-georgian), sans-serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: add Noto Sans Georgian font and LanguageProvider to root layout"
```

---

## Task 5: Translate DashboardSidebar + add LanguageSwitcher

**Files:**
- Modify: `components/shared/DashboardSidebar.tsx`

- [ ] **Step 1: Replace `components/shared/DashboardSidebar.tsx` with:**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplets, BookOpen, Utensils, Camera, Users, Calendar, LayoutDashboard, LogOut, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

export function DashboardSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const links = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/fitness',   labelKey: 'nav.fitness',   icon: Dumbbell },
    { href: '/water',     labelKey: 'nav.water',     icon: Droplets },
    { href: '/journal',   labelKey: 'nav.journal',   icon: BookOpen },
    { href: '/nutrition', labelKey: 'nav.nutrition', icon: Utensils },
    { href: '/cycle',     labelKey: 'nav.cycle',     icon: Calendar },
    { href: '/photos',    labelKey: 'nav.photos',    icon: Camera },
    { href: '/squads',    labelKey: 'nav.squads',    icon: Users },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-16 md:w-60 flex flex-col pt-7 gap-1 z-40">
      <div className="px-5 mb-7 hidden md:block">
        <span
          className="font-bold text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--foreground)' }}
        >
          75DaysLab
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-0.5 px-2">
        {links.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-[#2d3142] text-[#f5f3ef] shadow-sm'
                  : 'text-[#7c7d8a] hover:text-[#2d3142] hover:bg-white/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:block">{t(labelKey)}</span>
            </Link>
          )
        })}
      </div>

      <div className="px-2 pb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <ThemeToggle />
          <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            {t('nav.theme')}
          </span>
        </div>
        <div className="flex items-center gap-2 px-1">
          <LanguageSwitcher />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden md:block">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/DashboardSidebar.tsx
git commit -m "feat: translate DashboardSidebar, add LanguageSwitcher"
```

---

## Task 6: Translate login and register pages + add LanguageSwitcher

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Replace `app/(auth)/login/page.tsx` with:**

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t('auth.login.error'))
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute top-0 right-0 -mt-10">
        <LanguageSwitcher />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.login.submit')}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.login.or')}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.login.google')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.login.no_account')}{' '}
              <Link href="/register" className="text-primary hover:underline">
                {t('auth.login.create_one')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(auth)/register/page.tsx` with:**

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError(t('auth.register.error_short_password'))
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    let data: Record<string, string> = {}
    try {
      data = await res.json()
    } catch {
      // empty body
    }
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? t('auth.register.error_failed'))
      return
    }

    router.push('/login?registered=1')
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute top-0 right-0 -mt-10">
        <LanguageSwitcher />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
          <CardDescription>{t('auth.register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.register.username')}</Label>
              <Input
                id="username"
                placeholder="your_name"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.register.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.register.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="min. 8 characters"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.register.submit')}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.register.or')}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.register.google')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.register.has_account')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('auth.register.sign_in')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/login/page.tsx app/\(auth\)/register/page.tsx
git commit -m "feat: translate login and register pages, add LanguageSwitcher"
```

---

## Task 7: Translate onboarding page

**Files:**
- Modify: `app/(onboarding)/onboarding/page.tsx`

- [ ] **Step 1: Replace `app/(onboarding)/onboarding/page.tsx` with:**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import type { Goal, FocusArea, Gender } from '@/types'

type Step = 'profile' | 'goals' | 'focus' | 'timeline'

interface OnboardingData {
  age: string
  gender: Gender | ''
  heightCm: string
  weightKg: string
  goal: Goal | ''
  focusArea: FocusArea | ''
  totalDays: string
  startDate: string
}

const STEPS: Step[] = ['profile', 'goals', 'focus', 'timeline']

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    age: '', gender: '', heightCm: '', weightKg: '',
    goal: '', focusArea: '', totalDays: '75',
    startDate: new Date().toISOString().split('T')[0],
  })

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  function update(field: keyof OnboardingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  function canAdvance(): boolean {
    if (step === 'profile') return !!data.age && !!data.gender && !!data.heightCm && !!data.weightKg
    if (step === 'goals') return !!data.goal
    if (step === 'focus') return !!data.focusArea
    return true
  }

  async function submit() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/users/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      setError(t('onboarding.error_save'))
      return
    }
    router.push('/dashboard')
  }

  const genderOptions: { value: Gender; labelKey: string }[] = [
    { value: 'female', labelKey: 'onboarding.profile.female' },
    { value: 'male', labelKey: 'onboarding.profile.male' },
    { value: 'other', labelKey: 'onboarding.profile.other' },
  ]

  const goalOptions: { value: Goal; labelKey: string; descKey: string }[] = [
    { value: 'lose', labelKey: 'onboarding.goals.lose_label', descKey: 'onboarding.goals.lose_desc' },
    { value: 'gain', labelKey: 'onboarding.goals.gain_label', descKey: 'onboarding.goals.gain_desc' },
    { value: 'maintain', labelKey: 'onboarding.goals.maintain_label', descKey: 'onboarding.goals.maintain_desc' },
  ]

  const focusOptions: { value: FocusArea; labelKey: string }[] = [
    { value: 'nutrition', labelKey: 'onboarding.focus.nutrition' },
    { value: 'workout', labelKey: 'onboarding.focus.workout' },
    { value: 'sleep', labelKey: 'onboarding.focus.sleep' },
    { value: 'other', labelKey: 'onboarding.focus.other' },
  ]

  const stepTitleKeys: Record<Step, string> = {
    profile: 'onboarding.profile.title',
    goals: 'onboarding.goals.title',
    focus: 'onboarding.focus.title',
    timeline: 'onboarding.timeline.title',
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('onboarding.step_of', { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <CardTitle className="text-2xl">{t(stepTitleKeys[step])}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {step === 'profile' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('onboarding.profile.age')}</Label>
                <Input type="number" placeholder="25" value={data.age} onChange={e => update('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('onboarding.profile.gender')}</Label>
                <div className="flex gap-2">
                  {genderOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => update('gender', o.value)}
                      className={cn(
                        'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
                        data.gender === o.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                      )}
                    >{t(o.labelKey)}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('onboarding.profile.height')}</Label>
                <Input type="number" placeholder="170" value={data.heightCm} onChange={e => update('heightCm', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('onboarding.profile.weight')}</Label>
                <Input type="number" placeholder="70" value={data.weightKg} onChange={e => update('weightKg', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {step === 'goals' && (
          <div className="space-y-3">
            {goalOptions.map(o => (
              <button
                key={o.value}
                onClick={() => update('goal', o.value)}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-colors',
                  data.goal === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                )}
              >
                <div className="font-semibold">{t(o.labelKey)}</div>
                <div className="text-sm text-muted-foreground">{t(o.descKey)}</div>
              </button>
            ))}
          </div>
        )}

        {step === 'focus' && (
          <div className="grid grid-cols-2 gap-3">
            {focusOptions.map(o => (
              <button
                key={o.value}
                onClick={() => update('focusArea', o.value)}
                className={cn(
                  'p-4 rounded-lg border font-medium transition-colors',
                  data.focusArea === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                )}
              >{t(o.labelKey)}</button>
            ))}
          </div>
        )}

        {step === 'timeline' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('onboarding.timeline.start_date')}</Label>
              <Input type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                {t('onboarding.timeline.total_days')}{' '}
                <span className="text-muted-foreground font-normal">{t('onboarding.timeline.total_days_hint')}</span>
              </Label>
              <Input
                type="number" min="1" max="365"
                value={data.totalDays}
                onChange={e => update('totalDays', e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          {stepIndex > 0 && (
            <Button variant="outline" className="flex-1" onClick={back} disabled={loading}>{t('onboarding.back')}</Button>
          )}
          {step !== 'timeline' ? (
            <Button className="flex-1" onClick={next} disabled={!canAdvance()}>{t('onboarding.continue')}</Button>
          ) : (
            <Button className="flex-1" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('onboarding.start')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(onboarding\)/onboarding/page.tsx
git commit -m "feat: translate onboarding page"
```

---

## Task 8: Translate dashboard page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Open `app/(dashboard)/dashboard/page.tsx`. Add `useLanguage` import and replace all hardcoded strings.**

At the top of the file add:
```tsx
import { useLanguage } from '@/lib/i18n'
```

Inside `DashboardPage()`, add at the top of the function body:
```tsx
const { t } = useLanguage()
```

Replace `TASK_DEFS` constant (move it inside the component so it can call `t()`):
```tsx
const TASK_DEFS = [
  { id: 'water',     label: t('dashboard.task.water') },
  { id: 'journal',   label: t('dashboard.task.journal') },
  { id: 'workout',   label: t('dashboard.task.workout') },
  { id: 'nutrition', label: t('dashboard.task.nutrition') },
  { id: 'photo',     label: t('dashboard.task.photo') },
]
```

**Important:** Because `TASK_DEFS` moves inside the component, the `useEffect` that references `TASK_DEFS` will need it in scope — no other changes needed there.

Replace greeting line:
```tsx
// Before:
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
// After:
const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')
```

Replace JSX strings:
```tsx
// subtitle
<p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>

// badge
<Badge ...><Flame className="h-3 w-3 mr-1" /> {t('dashboard.day_complete')} 🎉</Badge>

// progress label
<span>{t('dashboard.progress')}</span>
<span>{t('dashboard.tasks_count', { done: completedCount, total: tasks.length })}</span>

// Hydration card title
<CardTitle className="text-base">{t('dashboard.hydration')}</CardTitle>

// Today's Tasks card title
<CardTitle className="text-base">{t('dashboard.todays_tasks')}</CardTitle>

// stat cards array
const stats = [
  { label: t('dashboard.stat.streak'), value: streak !== 1 ? t('dashboard.stat.streak_value_plural', { n: streak }) : t('dashboard.stat.streak_value', { n: streak }), icon: '🔥' },
  { label: t('dashboard.stat.day'),    value: t('dashboard.stat.day_value', { n: currentDay }), icon: '📅' },
  { label: t('dashboard.stat.days_left'), value: t('dashboard.stat.days_left_value', { n: totalDays - currentDay }), icon: '🏁' },
]
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: translate dashboard page"
```

---

## Task 9: Translate fitness page

**Files:**
- Modify: `app/(dashboard)/fitness/page.tsx`

- [ ] **Step 1: Add `useLanguage` import and replace all hardcoded strings in `app/(dashboard)/fitness/page.tsx`.**

Add import:
```tsx
import { useLanguage } from '@/lib/i18n'
```

Add inside component:
```tsx
const { t } = useLanguage()
```

Replace strings:
```tsx
// h1
<h1 className="text-3xl font-bold">{t('fitness.title')}</h1>
<p className="text-muted-foreground mt-1">{t('fitness.subtitle')}</p>

// "Today" heading
<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('fitness.today')}</h2>

// indoor/outdoor label
<p className="font-semibold text-sm">
  {type === 'indoor' ? '🏠 ' + t('fitness.indoor') : '🌤️ ' + t('fitness.outdoor')} · {t('fitness.min')}
</p>
<p className="text-xs text-muted-foreground">
  {done ? t('fitness.done') : t('fitness.not_done')}
</p>

// This Week card title
<CardTitle className="text-base">{t('fitness.this_week')}</CardTitle>

// dot legend
<p className="text-xs text-muted-foreground mt-3">{t('fitness.dot_legend')}</p>

// stat cards
const fitnessStats = [
  { label: t('fitness.stat.sessions'),   value: `${totalSessions}`, icon: '🏋️' },
  { label: t('fitness.stat.full_days'),  value: `${fullDays}`,      icon: '✅' },
  { label: t('fitness.stat.completion'), value: `${completionRate}%`, icon: '📊' },
]
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/fitness/page.tsx
git commit -m "feat: translate fitness page"
```

---

## Task 10: Translate water, journal, nutrition, cycle, photos, squads pages

**Files:**
- Modify: `app/(dashboard)/water/page.tsx`
- Modify: `app/(dashboard)/journal/page.tsx`
- Modify: `app/(dashboard)/nutrition/page.tsx`
- Modify: `app/(dashboard)/cycle/page.tsx`
- Modify: `app/(dashboard)/photos/page.tsx`
- Modify: `app/(dashboard)/squads/page.tsx`

- [ ] **Step 1: Translate `app/(dashboard)/water/page.tsx`**

Add import + hook:
```tsx
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
<h1 className="text-3xl font-bold">{t('water.title')}</h1>
<CardTitle>{t('water.card_title')}</CardTitle>
<p className="text-sm text-muted-foreground">{t('water.goal_desc', { ml: goalMl })}</p>
```

- [ ] **Step 2: Translate `app/(dashboard)/journal/page.tsx`**

Add import + hook:
```tsx
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
<h1 className="text-3xl font-bold">{t('journal.title')}</h1>
<CardTitle>{t('journal.card_title')}</CardTitle>
```

- [ ] **Step 3: Translate `app/(dashboard)/nutrition/page.tsx`**

Add import + hook:
```tsx
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
// h1
<h1 ...>{t('nutrition.title')}</h1>

// "Today" span
<span ...>{t('nutrition.today')}</span>

// "Daily Macros" section label
<p ...>{t('nutrition.daily_macros')}</p>

// "Log a Meal" section label
<p ...>{t('nutrition.log_meal')}</p>

// "Today's Log" section label
<p ...>{t('nutrition.todays_log')}</p>
```

- [ ] **Step 4: Translate `app/(dashboard)/cycle/page.tsx`**

This is a server component (no `'use client'`). Add `'use client'` directive at top, then add import + hook:
```tsx
'use client'
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
<h1 className="text-3xl font-bold">{t('cycle.title')}</h1>
<CardTitle>{t('cycle.card_title')}</CardTitle>
```

- [ ] **Step 5: Translate `app/(dashboard)/photos/page.tsx`**

Add import + hook:
```tsx
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
<h1 className="text-3xl font-bold">{t('photos.title')}</h1>
<TabsTrigger value="upload" className="flex-1">{t('photos.tab.upload')}</TabsTrigger>
<TabsTrigger value="compare" className="flex-1">{t('photos.tab.compare')}</TabsTrigger>
<TabsTrigger value="vault" className="flex-1">{t('photos.tab.vault')}</TabsTrigger>
<CardTitle>{t('photos.day_photo', { n: currentDay })}</CardTitle>
{photos.some(p => p.dayNumber === currentDay) && (
  <p className="text-xs text-green-500 text-center mt-3">{t('photos.day_saved', { n: currentDay })}</p>
)}
<CardTitle>{t('photos.compare_title')}</CardTitle>
<label className="text-xs text-muted-foreground">{t('photos.before')}</label>
<label className="text-xs text-muted-foreground">{t('photos.after')}</label>
<CardTitle>{t('photos.vault_title', { n: photos.length })}</CardTitle>
{photos.length === 0 ? (
  <p className="text-muted-foreground text-sm text-center py-8">{t('photos.empty')}</p>
) : ...}
// inside vault map:
<div className="absolute bottom-1 left-1 ...">
  {t('photos.day_label', { n: p.dayNumber })}
</div>
```

- [ ] **Step 6: Translate `app/(dashboard)/squads/page.tsx`**

Add import + hook:
```tsx
import { useLanguage } from '@/lib/i18n'
// inside component:
const { t } = useLanguage()
```

Replace strings:
```tsx
// Back button in selected squad view
<Button variant="outline" size="sm" onClick={() => setSelectedSquad(null)}>{t('squads.back')}</Button>
<CardTitle>{t('squads.leaderboard')}</CardTitle>

// Main list view
<h1 className="text-3xl font-bold">{t('squads.title')}</h1>
// Join button trigger label
<Hash className="h-4 w-4 mr-1" />{t('squads.join')}
// Create button trigger label
<Plus className="h-4 w-4 mr-1" />{t('squads.create')}
// Dialogs
<DialogTitle>{t('squads.join_dialog_title')}</DialogTitle>
<Label>{t('squads.join_code_label')}</Label>
<Button className="w-full" onClick={joinSquad}>{t('squads.join_submit')}</Button>
<DialogTitle>{t('squads.create_dialog_title')}</DialogTitle>
<Label>{t('squads.create_name_label')}</Label>
<Button className="w-full" onClick={createSquad} disabled={!newName.trim()}>{t('squads.create_submit')}</Button>
// empty state
<p className="text-muted-foreground text-center py-12">{t('squads.empty')}</p>
```

- [ ] **Step 7: Commit all**

```bash
git add app/\(dashboard\)/water/page.tsx app/\(dashboard\)/journal/page.tsx app/\(dashboard\)/nutrition/page.tsx app/\(dashboard\)/cycle/page.tsx app/\(dashboard\)/photos/page.tsx app/\(dashboard\)/squads/page.tsx
git commit -m "feat: translate water, journal, nutrition, cycle, photos, squads pages"
```

---

## Task 11: Run locally and verify

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000` with no TypeScript errors.

- [ ] **Step 2: Manual verification checklist**

Open `http://localhost:3000/login` and verify:
- [ ] EN/GE switcher visible top-right of the card
- [ ] Click GE → all login page text switches to Georgian
- [ ] Georgian script renders with correct font (Noto Sans Georgian, not boxes/question marks)
- [ ] Click EN → text switches back to English
- [ ] Navigate to `/register` → switcher present, same behavior
- [ ] Log in → navigate to `/dashboard`
- [ ] EN/GE switcher visible in sidebar bottom section
- [ ] Click GE → sidebar nav labels, dashboard text all switch to Georgian
- [ ] Refresh page → locale resets to EN (sessionStorage, not localStorage)
- [ ] `html[lang]` attribute in DevTools updates to `ge` / `en` on switch
- [ ] `html.lang-ge` class toggled in DevTools
