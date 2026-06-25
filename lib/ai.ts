import OpenAI from 'openai'

export const STORE_LINKS = `Carrefour https://www.carrefour.ge · Agrohub https://agrohub.ge · Nikora https://www.nikora.ge · 2 Nabiji https://2nabiji.ge · Spar https://www.spar-georgia.com · Magniti https://magniti.ge · Smart https://smart.ge`

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
  usdaContext: string | null,
  groceryContext?: string | null,
  webRecipeContext?: string | null,
  recipeRequest?: { dish: string; pantry?: string[] } | null,
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

  const groceryBlock = groceryContext
    ? `\nGROCERY PRICE DATA (real scraped prices — the ONLY prices you may state):\n${groceryContext}\nRULE: Use ONLY the numbers above — do not invent your own. A plain price (e.g. "Agrohub ₾4.95") is a real scraped price; state it as exact. A value marked "≈ approx estimate" is a rough estimate, NOT a live price — present it as approximate and tell the user to verify on the store apps/sites. All prices are in Georgian Lari (₾), never $ or USD. For anything with no number, say "not available" and point to the official stores: ${STORE_LINKS}`
    : ''

  const webRecipeBlock = webRecipeContext
    ? `\nWEB RECIPE (present THIS recipe to the user — ingredients and steps):\n${webRecipeContext}\nRULE: Present this recipe's ingredients and numbered steps clearly. Do NOT output any URL, website name, or source — only the recipe content itself.`
    : ''

  // When no real web recipe was found, generate a custom one. Mutually exclusive
  // with webRecipeBlock (the route sets only one).
  const recipeGenBlock = !webRecipeContext && recipeRequest
    ? `\nGENERATE A RECIPE for: "${recipeRequest.dish}".${
        recipeRequest.pantry?.length
          ? ` The user already has at home: ${recipeRequest.pantry.join(', ')}. Build the recipe primarily around these, and clearly list any EXTRA ingredients they'd need to buy under a short "To buy" heading so they can price them.`
          : ''
      }\nRULE: Output a complete, original recipe — a title, a full ingredient list (with amounts), and numbered steps. Keep it health- and budget-conscious for the user's goal. This recipe response MAY exceed the usual length limit (Hard Rule 1 does not apply to the recipe body). Do NOT fabricate any specific store price; if you mention cost, use Georgian Lari (₾), never $ or USD, and point to checking the stores.`
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

${nutritionBlock}${groceryBlock}${webRecipeBlock}${recipeGenBlock}

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
    const parsed = JSON.parse(match[1])
    if (
      typeof parsed.calories !== 'number' ||
      typeof parsed.proteinG !== 'number' ||
      typeof parsed.carbsG !== 'number' ||
      typeof parsed.fatG !== 'number' ||
      typeof parsed.food !== 'string'
    ) {
      return { message: responseText.trim(), macros: null }
    }
    const macros = parsed as MacroData
    const message = responseText.replace(/<macros>[\s\S]*?<\/macros>/, '').trim()
    return { message, macros }
  } catch {
    return { message: responseText.trim(), macros: null }
  }
}

// Paid slug — the `:free` vision model was pulled by OpenRouter (404/429), which
// silently broke photo scanning. Paid llama-3.2-11b-vision is cheap and reliable.
const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct'

const PHOTO_SYSTEM = `You are a nutrition vision estimator. Look at the food photo and estimate its nutrition for the full portion shown.
Reply with ONLY this tag and nothing else:
<macros>{"calories":0,"proteinG":0,"carbsG":0,"fatG":0,"food":"short description"}</macros>
Use realistic estimates. If the image is not food, set all numbers to 0 and food to "not food".`

export async function parseFoodPhoto(imageUrl: string): Promise<MacroData | null> {
  try {
    const completion = await openRouterClient.chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 256,
      messages: [
        { role: 'system', content: PHOTO_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Estimate the nutrition of this food.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] as never,
        },
      ],
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const { macros } = parseMacros(raw)
    if (!macros || macros.food === 'not food') return null
    return macros
  } catch (err) {
    console.error('[parseFoodPhoto]', err instanceof Error ? err.message : String(err))
    return null
  }
}
