# LabAI Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI coach widget ("LabAI") to all dashboard pages, powered by OpenRouter, with food macro detection, weather-aware workout tips, and recipe coaching.

**Architecture:** Single `POST /api/ai/chat` route fetches weather + USDA nutrition data server-side, assembles a system prompt with user context, calls OpenRouter, and parses `<macros>` tags for food logging. A floating `LabAIWidget` client component in the dashboard layout sends requests and auto-POSTs returned macros to `/api/nutrition`.

**Tech Stack:** `openai` SDK v6 (custom base URL → OpenRouter), USDA FDC public API, OpenWeather API, React `useState`/`useEffect`, Tailwind CSS, existing shadcn/ui components.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `.env.local` | Add `OPENROUTER_API_KEY` |
| Modify | `models/User.ts` | Add optional `city` field for weather lookups |
| Create | `lib/ai.ts` | OpenRouter client, `buildSystemPrompt()`, `parseMacros()` |
| Create | `app/api/ai/chat/route.ts` | POST handler — weather + USDA + OpenRouter + macro parsing |
| Create | `components/ai/ChatMessage.tsx` | Single message bubble (user or AI) |
| Create | `components/ai/LabAIWidget.tsx` | Floating button + chat panel + MacroCard |
| Modify | `app/(dashboard)/layout.tsx` | Mount `<LabAIWidget />` |

---

## Task 1: Environment Variables + User Model

**Files:**
- Modify: `.env.local`
- Modify: `models/User.ts`

- [ ] **Step 1: Add `OPENROUTER_API_KEY` to `.env.local`**

Open `.env.local` and add at the end:
```
OPENROUTER_API_KEY=your-openrouter-key-here
FDC_API_KEY=DEMO_KEY
```

> `OPENWEATHER_API_KEY` already exists in the file but is set to `placeholder`. Replace it with a real OpenWeather key (free at openweathermap.org) when available. Weather features will silently degrade to `null` until a real key is set.

- [ ] **Step 2: Add `city` field to User model**

In `models/User.ts`, add `city` to the interface and schema. The current interface ends at `updatedAt: Date` — add `city?: string` before the closing brace. The schema `UserSchema` block similarly needs the field added before the closing `}` of the Schema call.

Current `IUser` interface (lines 1–17):
```typescript
export interface IUser extends Document {
  username: string
  email: string
  passwordHash?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  goal?: 'lose' | 'gain' | 'maintain' | 'healthy'
  focusArea?: 'nutrition' | 'workout' | 'sleep' | 'other'
  onboardingComplete: boolean
  role: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
}
```

Replace with:
```typescript
export interface IUser extends Document {
  username: string
  email: string
  passwordHash?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  heightCm?: number
  weightKg?: number
  goal?: 'lose' | 'gain' | 'maintain' | 'healthy'
  focusArea?: 'nutrition' | 'workout' | 'sleep' | 'other'
  city?: string
  onboardingComplete: boolean
  role: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
}
```

In the `UserSchema` definition, add `city: { type: String }` after the `focusArea` line:
```typescript
    focusArea: { type: String, enum: ['nutrition', 'workout', 'sleep', 'other'] },
    city: { type: String },
    onboardingComplete: { type: Boolean, default: false },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors appear, check that the `city` field was added to both interface and schema.

- [ ] **Step 4: Commit**

```bash
git add .env.local models/User.ts
git commit -m "feat(labai): add env vars and city field to User model"
```

---

## Task 2: AI Utility Library (`lib/ai.ts`)

**Files:**
- Create: `lib/ai.ts`

- [ ] **Step 1: Create `lib/ai.ts`**

```typescript
import OpenAI from 'openai'

export const openRouterClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    'X-Title': '75DaysLab',
  },
})

export interface WeatherContext {
  temp: number
  condition: string
  precipitation: boolean
}

export interface UserContext {
  age?: number
  gender?: string
  heightCm?: number
  weightKg?: number
  goal?: string
  focusArea?: string
}

export interface ProgressContext {
  streak_day: number
  water_intake_ml: number
  workout_1_completed: boolean
  workout_2_completed: boolean
  calories_consumed: number
  daily_calorie_target: number
}

export interface MacroData {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  food: string
}

export function buildSystemPrompt(
  user: UserContext,
  progress: ProgressContext,
  weather: WeatherContext | null,
  usdaContext: string | null
): string {
  const goalLabel =
    user.goal === 'lose'
      ? 'Lose Weight'
      : user.goal === 'gain'
      ? 'Gain Weight'
      : user.goal === 'maintain'
      ? 'Maintain Weight'
      : 'Healthy Lifestyle'

  const weatherBlock = weather
    ? `CURRENT WEATHER: ${weather.temp}°C, ${weather.condition}${weather.precipitation ? ', precipitation expected' : ''}`
    : `WEATHER: Unavailable. If the user asks about outdoor workouts, ask them to set their city in their profile settings.`

  const nutritionBlock = usdaContext
    ? `NUTRITION REFERENCE DATA (from USDA FDC — use this for accurate macro estimates):\n${usdaContext}`
    : ''

  return `You are "LabAI", an elite, empathetic, yet highly disciplined fitness, nutrition, and lifestyle coach integrated directly into the 75DaysLab platform.

TONE: Motivational, direct, scientifically accurate, concise. Speak like a helpful peer and expert trainer — never academic, verbose, or robotic. Match the clean, minimalist aesthetic of the platform. No bullet-point walls; keep answers scannable.

USER PROFILE:
- Age: ${user.age ?? 'not set'} | Gender: ${user.gender ?? 'not set'}
- Height: ${user.heightCm ? user.heightCm + 'cm' : 'not set'} | Weight: ${user.weightKg ? user.weightKg + 'kg' : 'not set'}
- Goal: ${goalLabel} | Focus area: ${user.focusArea ?? 'general'}

TODAY'S PROGRESS (Day ${progress.streak_day} of 75):
- Water: ${progress.water_intake_ml}ml consumed
- Indoor workout: ${progress.workout_1_completed ? 'completed ✓' : 'not done yet'}
- Outdoor workout: ${progress.workout_2_completed ? 'completed ✓' : 'not done yet'}
- Calories: ${progress.calories_consumed} consumed / ${progress.daily_calorie_target} daily target

${weatherBlock}

${nutritionBlock}

HARD RULES — NEVER BREAK THESE:
1. Max 3 brief paragraphs OR 4 bullet points per response. Keep it highly readable.
2. You are a lifestyle/fitness coach, NOT a medical professional. If the user asks about extreme diets, injuries, or medical conditions, politely decline and redirect them to a healthcare professional.
3. NEVER say it is okay to skip a day. If the user reports missing a day, firmly but encouragingly remind them: the 75 Days Hard rules require a Hard Reset — the streak returns to Day 1 and they start over.
4. If weight, city, or other required data is missing, ask the user to update their profile/dashboard rather than guessing.
5. Do NOT wrap coaching tips in markdown code blocks. Keep prose natural.

FOOD LOGGING — OUTPUT FORMAT RULE:
When the user mentions consuming food or drinks, you MUST append the following tag at the very end of your response (after your text), with real estimated values:
<macros>{"calories":0,"proteinG":0,"carbsG":0,"fatG":0,"food":"short description"}</macros>

Use the USDA reference data above if provided. Otherwise use standard nutritional knowledge to estimate per the actual amount mentioned.
If the user is NOT mentioning eating or drinking, do NOT include the <macros> tag at all.`
}

export function parseMacros(responseText: string): { message: string; macros: MacroData | null } {
  const match = responseText.match(/<macros>(\{[\s\S]*?\})<\/macros>/)
  if (!match) return { message: responseText.trim(), macros: null }

  try {
    const macros = JSON.parse(match[1]) as MacroData
    const message = responseText.replace(/<macros>[\s\S]*?<\/macros>/, '').trim()
    return { message, macros }
  } catch {
    return { message: responseText.trim(), macros: null }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat(labai): add OpenRouter client and system prompt builder"
```

---

## Task 3: AI Chat API Route (`app/api/ai/chat/route.ts`)

**Files:**
- Create: `app/api/ai/chat/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { openRouterClient, buildSystemPrompt, parseMacros } from '@/lib/ai'
import type { WeatherContext, ProgressContext } from '@/lib/ai'

async function fetchWeather(city: string): Promise<WeatherContext | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'placeholder') return null

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json()
    const mainCondition: string = (data.weather?.[0]?.main ?? '').toLowerCase()
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather?.[0]?.description ?? 'unknown',
      precipitation: ['rain', 'drizzle', 'snow', 'thunderstorm'].includes(mainCondition),
    }
  } catch {
    return null
  }
}

async function fetchUsdaContext(query: string): Promise<string | null> {
  const apiKey = process.env.FDC_API_KEY ?? 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=3&dataType=SR%20Legacy,Foundation`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const foods: Array<{
      description: string
      foodNutrients: Array<{ nutrientId: number; value: number }>
    }> = data.foods?.slice(0, 3) ?? []
    if (!foods.length) return null

    return foods
      .map(f => {
        const n = f.foodNutrients ?? []
        const get = (id: number) => n.find(x => x.nutrientId === id)?.value?.toFixed(1) ?? '?'
        return `${f.description}: ${get(1008)} kcal, ${get(1003)}g protein, ${get(1005)}g carbs, ${get(1004)}g fat per 100g`
      })
      .join('\n')
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: string; mode?: string; todayProgress?: ProgressContext }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, mode = 'chat', todayProgress } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findById(session.user.id).select(
    'age gender heightCm weightKg goal focusArea city'
  )

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const userContext = {
    age: user.age,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    goal: user.goal,
    focusArea: user.focusArea,
  }

  const progress: ProgressContext = todayProgress ?? {
    streak_day: 1,
    water_intake_ml: 0,
    workout_1_completed: false,
    workout_2_completed: false,
    calories_consumed: 0,
    daily_calorie_target: 2000,
  }

  const [weather, usdaContext] = await Promise.all([
    user.city ? fetchWeather(user.city) : Promise.resolve(null),
    mode === 'food_log' ? fetchUsdaContext(message) : Promise.resolve(null),
  ])

  const systemPrompt = buildSystemPrompt(userContext, progress, weather, usdaContext)

  let rawText: string
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 512,
    })
    rawText = completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    console.error('[LabAI] OpenRouter error:', err)
    return NextResponse.json(
      { error: 'LabAI is unavailable, try again.' },
      { status: 502 }
    )
  }

  const { message: aiMessage, macros } = parseMacros(rawText)

  return NextResponse.json({ message: aiMessage, macros })
}
```

- [ ] **Step 2: Test the route manually with curl**

Start the dev server first: `npm run dev`

Then in a separate terminal, get a session cookie by logging in via the browser, then:

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your session cookie>" \
  -d '{
    "message": "I ate 2 scrambled eggs and an avocado for breakfast",
    "mode": "food_log",
    "todayProgress": {
      "streak_day": 1,
      "water_intake_ml": 500,
      "workout_1_completed": false,
      "workout_2_completed": false,
      "calories_consumed": 0,
      "daily_calorie_target": 2000
    }
  }'
```

Expected: JSON response with `message` (text) and `macros` (object with `calories`, `proteinG`, `carbsG`, `fatG`, `food`).

- [ ] **Step 3: Test unauthenticated request returns 401**

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

Expected: `{"error":"Unauthorized"}` with status 401.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "feat(labai): add /api/ai/chat route with OpenRouter + USDA + weather"
```

---

## Task 4: ChatMessage Component (`components/ai/ChatMessage.tsx`)

**Files:**
- Create: `components/ai/ChatMessage.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

interface ChatMessageProps {
  role: 'user' | 'ai'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--foreground)',
                color: 'var(--background)',
                borderBottomRightRadius: '4px',
              }
            : {
                background: 'var(--muted)',
                color: 'var(--foreground)',
                borderBottomLeftRadius: '4px',
              }
        }
      >
        {content}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ai/ChatMessage.tsx
git commit -m "feat(labai): add ChatMessage bubble component"
```

---

## Task 5: Floating Chat Widget (`components/ai/LabAIWidget.tsx`)

**Files:**
- Create: `components/ai/LabAIWidget.tsx`

This component:
1. Fetches user profile + challenge day on mount via `/api/users/me`
2. Detects message mode from keywords
3. POSTs to `/api/ai/chat` and displays the response
4. When macros are returned, auto-POSTs to `/api/nutrition`
5. Shows a `MacroCard` in the chat when food was logged

- [ ] **Step 1: Create `components/ai/LabAIWidget.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react'
import { ChatMessage } from '@/components/ai/ChatMessage'
import type { MacroData, ProgressContext } from '@/lib/ai'

interface Message {
  role: 'user' | 'ai'
  content: string
  macros?: MacroData
}

const FOOD_KEYWORDS = ['ate', 'eat', 'drank', 'drink', 'had', 'food', 'meal', 'calories', 'protein', 'breakfast', 'lunch', 'dinner', 'snack']
const FITNESS_KEYWORDS = ['workout', 'exercise', 'run', 'gym', 'train', 'weather', 'outdoor', 'indoor']

function detectMode(message: string): 'food_log' | 'fitness' | 'chat' {
  const lower = message.toLowerCase()
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) return 'food_log'
  if (FITNESS_KEYWORDS.some(k => lower.includes(k))) return 'fitness'
  return 'chat'
}

function MacroCard({ macros }: { macros: MacroData }) {
  return (
    <div
      className="mt-2 rounded-xl px-4 py-3 text-xs"
      style={{ background: 'var(--accent)', color: 'var(--accent-foreground)', border: '1px solid var(--border)' }}
    >
      <p className="font-semibold mb-1 text-[11px] uppercase tracking-wide opacity-60">Logged</p>
      <p className="font-medium mb-1">{macros.food}</p>
      <div className="flex gap-3 opacity-80">
        <span>{macros.calories} cal</span>
        <span>{macros.proteinG}g P</span>
        <span>{macros.carbsG}g C</span>
        <span>{macros.fatG}g F</span>
      </div>
    </div>
  )
}

export function LabAIWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [challengeDay, setChallengeDay] = useState<number | null>(null)
  const [todayCalories, setTodayCalories] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      try {
        const [meRes, nutritionRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch(`/api/nutrition?date=${new Date().toISOString().split('T')[0]}`),
        ])

        if (meRes.ok) {
          const me = await meRes.json()
          const startDate = new Date(me.startDate)
          const day = Math.min(
            Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
            me.totalDays ?? 75
          )
          setChallengeDay(Math.max(1, day))
        }

        if (nutritionRes.ok) {
          const nutrition = await nutritionRes.json()
          setTodayCalories(nutrition.totals?.calories ?? 0)
        }
      } catch {
        // silently degrade — widget works without this data
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const mode = detectMode(text)
    const progress: ProgressContext = {
      streak_day: challengeDay ?? 1,
      water_intake_ml: 0,
      workout_1_completed: false,
      workout_2_completed: false,
      calories_consumed: todayCalories,
      daily_calorie_target: 2000,
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode, todayProgress: progress }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.error ?? 'Something went wrong.' }])
        return
      }

      const aiMsg: Message = { role: 'ai', content: data.message, macros: data.macros ?? undefined }
      setMessages(prev => [...prev, aiMsg])

      if (data.macros) {
        const m = data.macros as MacroData
        setTodayCalories(prev => prev + m.calories)
        await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: m.food,
            calories: m.calories,
            proteinG: m.proteinG,
            carbsG: m.carbsG,
            fatG: m.fatG,
          }),
        })
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'LabAI is unavailable right now. Try again shortly.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        aria-label={open ? 'Close LabAI' : 'Open LabAI coach'}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--border)',
            height: '480px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" style={{ color: 'var(--foreground)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                LabAI Coach
              </span>
            </div>
            {challengeDay !== null && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                Day {challengeDay}/75
              </span>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p
                className="text-center text-xs mt-8"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Ask about nutrition, workouts, or recipes. I know your goal.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <ChatMessage role={msg.role} content={msg.content} />
                {msg.macros && <MacroCard macros={msg.macros} />}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', borderBottomLeftRadius: '4px' }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>LabAI is thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask LabAI…"
              disabled={loading}
              className="flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
              style={{
                background: 'var(--muted)',
                color: 'var(--foreground)',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity"
              style={{
                background: input.trim() && !loading ? 'var(--foreground)' : 'var(--muted)',
                color: input.trim() && !loading ? 'var(--background)' : 'var(--muted-foreground)',
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. Common issues:
- If `Bot` icon is not in lucide-react, replace with `MessageCircle`.
- If `ProgressContext` or `MacroData` import fails, check that `lib/ai.ts` exports them.

- [ ] **Step 3: Commit**

```bash
git add components/ai/LabAIWidget.tsx components/ai/ChatMessage.tsx
git commit -m "feat(labai): add floating chat widget with macro card"
```

---

## Task 6: Mount Widget in Dashboard Layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add `<LabAIWidget />` to layout**

Current `layout.tsx` return (lines 26–33):
```typescript
  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 ml-16 md:ml-56 p-6">
        {children}
      </main>
    </div>
  )
```

Replace with:
```typescript
  return (
    <div className="min-h-screen flex">
      <DashboardSidebar />
      <main className="flex-1 ml-16 md:ml-56 p-6">
        {children}
      </main>
      <LabAIWidget />
    </div>
  )
```

Also add the import at the top of the file (after existing imports):
```typescript
import { LabAIWidget } from '@/components/ai/LabAIWidget'
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify the widget appears**

```bash
npm run dev
```

1. Open `http://localhost:3000` and log in
2. Navigate to any dashboard page
3. Confirm the circular LabAI button appears bottom-right
4. Click it — the chat panel should slide open showing "Ask about nutrition, workouts, or recipes."
5. Type "I ate a banana" and press Enter
6. Confirm a response appears with a MacroCard showing estimated calories/macros
7. Open a new tab to `http://localhost:3000/nutrition` and verify the banana was logged in today's food entries

- [ ] **Step 4: Test fitness mode**

In the LabAI chat, type "What workout should I do today?" and confirm a response appears (no MacroCard).

- [ ] **Step 5: Test chat mode**

Type "Give me a high-protein breakfast recipe" and confirm a recipe response appears (no MacroCard).

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat(labai): mount LabAIWidget in dashboard layout"
```

---

## Self-Review Checklist (completed inline)

- [x] **Spec § Food Logging (Dual Entry)** → Task 3 (USDA fetch + macro parse) + Task 5 (auto-POST to `/api/nutrition`)
- [x] **Spec § Weather-Synced Workouts** → Task 3 (`fetchWeather` server-side), system prompt in Task 2
- [x] **Spec § Smart Chat & Recipe Coaching** → `mode: "chat"` path in Task 3 + Task 5 mode detection
- [x] **Spec § OpenRouter client** → Task 2 `lib/ai.ts`
- [x] **Spec § `<macros>` tag parsing** → `parseMacros()` in Task 2, used in Task 3
- [x] **Spec § Floating widget, bottom-right** → Task 5
- [x] **Spec § MacroData uses `proteinG`/`carbsG`/`fatG`** → aligned with `FoodLog` model and `FoodEntry` type
- [x] **Spec § Guardrails / persona** → `buildSystemPrompt()` Task 2
- [x] **Spec § OPENROUTER_API_KEY env var** → Task 1
- [x] **Spec § `city` field for weather** → Task 1 User model change
- [x] **Type consistency** → `MacroData` uses `proteinG`/`carbsG`/`fatG` in lib/ai.ts, ChatRequest, LabAIWidget, and `/api/nutrition` POST — consistent throughout
