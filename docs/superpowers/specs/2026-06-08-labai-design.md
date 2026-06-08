# LabAI Coach — Design Spec

**Date:** 2026-06-08
**Status:** Approved

---

## Overview

Integrate an AI fitness and nutrition coach ("LabAI") into the 75DaysLab platform. The AI uses the OpenRouter API (model: `nvidia/nemotron-3-nano-30b-a3b:free`) and covers three core capabilities: food logging with macro calculation, weather-synced workout recommendations, and smart recipe/coaching chat.

The interface is a **floating chat widget** accessible from every dashboard page, built as a single `LabAIWidget` component mounted in the root dashboard layout.

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `components/ai/LabAIWidget.tsx` | Floating button + slide-up chat panel |
| `components/ai/ChatMessage.tsx` | Individual message bubble (user/AI) |
| `lib/ai.ts` | OpenRouter client config + system prompt builder |
| `app/api/ai/chat/route.ts` | POST endpoint — handles all three AI modes |

### Modified Files

| File | Change |
|------|--------|
| `app/(dashboard)/layout.tsx` | Mount `<LabAIWidget />` |
| `.env.local` | Add `OPENROUTER_API_KEY` |

### Data Flow

```
User types message
  → LabAIWidget POST /api/ai/chat
      payload: { message, mode, userProfile, todayProgress, currentWeather }
  → lib/ai.ts: assemble system prompt + inject context
  → OpenRouter API (nvidia/nemotron model)
  → Parse response: extract <macros> tag if present
  → Return { message: string, macros?: MacroData }
  → If macros present: auto-POST to /api/nutrition (dual entry)
  → Display AI message in chat panel
```

---

## Feature Specifications

### 1. Food Logging (Dual Entry)

- User can log food by typing in the chat widget (e.g., "I ate 2 eggs and an avocado") **or** via the existing manual `FoodLogger.tsx`
- Both paths write to the same `FoodLog` MongoDB collection
- AI food logging flow:
  1. Frontend detects food keywords → sets `mode: "food_log"`
  2. API route queries USDA FDC API for the mentioned foods (free `DEMO_KEY` or user-supplied `FDC_API_KEY`)
  3. USDA nutrition data injected into AI prompt for accuracy
  4. AI returns natural language response + `<macros>` tag:
     ```
     Great choice for your weight loss goal! You've got 40g of protein remaining today.
     <macros>{"calories":380,"protein":14,"carbs":9,"fat":32,"food":"2 eggs + avocado"}</macros>
     ```
  5. Backend strips `<macros>` tag, returns `{ message, macros }`
  6. Frontend auto-POSTs macros to `/api/nutrition`

**Macro response shape:**
```typescript
interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: string;
}
```

### 2. Weather-Synced Workout Recommendations

- On widget open, frontend fetches current weather via existing `OPENWEATHER_API_KEY`
- Weather data (`temp`, `condition`, `precipitation`) injected into every AI request payload
- When `mode === "fitness"`, AI reads weather and responds:
  - Bad weather (rain/snow/extreme temp): indoor 45-min routine tip
  - Good weather: outdoor route/activity suggestion
- AI also returns 2–3 workout keyword tags that the frontend can use:
  - Tag format (natural language, no structured extraction needed for v1): AI mentions tags in message text, frontend displays as-is

### 3. Smart Chat & Recipe Coaching

- General coaching chat for any question matching the LabAI persona
- Recipe requests: AI returns quick recipe based on ingredients + user's caloric goal
- `mode: "chat"` — no USDA lookup, no macro extraction

---

## API Route Design (`POST /api/ai/chat`)

### Request Body
```typescript
interface ChatRequest {
  message: string;
  mode: "food_log" | "fitness" | "chat";
  userProfile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    primary_goal: "Lose" | "Gain" | "Maintain";
    focus_area: string;
  };
  todayProgress: {
    streak_day: number;
    water_intake_ml: number;
    workout_1_completed: boolean;
    workout_2_completed: boolean;
    calories_consumed: number;
    daily_calorie_target: number;
  };
}
```

### Response Body
```typescript
interface ChatResponse {
  message: string;
  macros?: MacroData;
}
```

### Route Logic
1. Validate request body
2. Fetch user's location from their profile (MongoDB), then call OpenWeather API server-side — `OPENWEATHER_API_KEY` stays server-only
3. If `mode === "food_log"`: fetch USDA FDC data for message keywords
4. Assemble system prompt via `lib/ai.ts` `buildSystemPrompt()` with user context + weather
5. Call OpenRouter using `openai` SDK with custom `baseURL`
6. Parse response: regex-extract `<macros>{...}</macros>` if present
7. Return `{ message, macros? }`

### Error Handling
- OpenRouter failure → 502 with user-facing message: "LabAI is unavailable, try again."
- USDA FDC failure → silently continue without nutrition data (AI estimates)
- OpenWeather failure or missing user location → pass `currentWeather: null`; AI asks user to update profile
- Missing user profile fields → AI instructed to ask user to complete onboarding

---

## OpenRouter Client (`lib/ai.ts`)

```typescript
// Uses existing openai package with custom base URL
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXTAUTH_URL,
    "X-Title": "75DaysLab",
  },
});
```

### System Prompt Structure

1. **Persona block** — LabAI identity, tone, formatting rules
2. **User context block** — injected profile + today's progress
3. **Weather context block** — injected if available
4. **Nutrition context block** — injected USDA data (food_log mode only)
5. **Guardrails block** — length limit, medical guardrail, challenge rules, data isolation rules
6. **Output format instruction** — append `<macros>` tag when food is detected

---

## Widget UI (`components/ai/LabAIWidget.tsx`)

### Collapsed State
- Circular button, fixed bottom-right (`fixed bottom-6 right-6 z-50`)
- Icon: chat bubble or robot
- Pulse dot indicator when AI has unseen content (future enhancement, not v1)

### Expanded State
```
┌─────────────────────────────────┐
│  LabAI Coach        Day 12/75   │  header
├─────────────────────────────────┤
│                                 │
│  [AI message bubble]            │  scroll area
│               [User bubble]     │
│  [AI message bubble]            │
│  ┌── MacroCard ───────────────┐ │
│  │ 380 cal · 14g P · 32g F   │ │  shown if macros returned
│  └───────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  [Type a message...]      [→]   │  input row
└─────────────────────────────────┘
```

### State Management
- Local `useState` in widget component — no global store
- Chat history clears on page refresh (v1 — no persistence)
- Weather fetched server-side inside `/api/ai/chat` route — `OPENWEATHER_API_KEY` never exposed to client

### Mode Auto-Detection (client-side)
```typescript
const FOOD_KEYWORDS = ["ate", "eat", "drank", "drink", "had", "food", "meal", "calories", "protein"];
const FITNESS_KEYWORDS = ["workout", "exercise", "run", "gym", "train", "weather"];

function detectMode(message: string): "food_log" | "fitness" | "chat" {
  const lower = message.toLowerCase();
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) return "food_log";
  if (FITNESS_KEYWORDS.some(k => lower.includes(k))) return "fitness";
  return "chat";
}
```

---

## LabAI Persona & Guardrails (System Prompt Content)

### Identity
> You are "LabAI", an elite, empathetic, yet highly disciplined fitness, nutrition, and lifestyle coach integrated directly into the 75DaysLab platform.

### Tone
Motivational, direct, scientifically accurate, concise. Helpful peer and expert trainer — never academic, verbose, or robotic.

### Hard Rules
1. **Length limit:** Max 3 brief paragraphs OR 4 bullet points per response
2. **Medical guardrail:** Not a medical professional. Redirect extreme diet/injury/medical questions to a professional
3. **No skip days:** Never tell user it's okay to skip. Failure = Hard Reset (streak back to Day 1) — firm but encouraging
4. **Data isolation:** If weather or weight is null, ask user to update dashboard rather than guessing
5. **No code blocks** in conversational output

---

## Environment Variables

| Key | Value | Notes |
|-----|-------|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Provided by user |
| `FDC_API_KEY` | `DEMO_KEY` | USDA FDC free tier; upgrade if rate-limited |
| `OPENWEATHER_API_KEY` | existing | Already in `.env.local` |

---

## Out of Scope (v1)

- Chat history persistence across sessions
- Image-based food logging (camera/photo upload to AI)
- Streaming responses
- YouTube video card embedding (tags returned in text only)
- Push notifications / proactive AI suggestions
