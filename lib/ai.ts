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
