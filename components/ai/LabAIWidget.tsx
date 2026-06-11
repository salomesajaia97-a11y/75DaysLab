'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react'
import { ChatMessage } from '@/components/ai/ChatMessage'
import type { MacroData, ProgressContext } from '@/lib/ai'

interface Message {
  id: string
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
  const [waterMl, setWaterMl] = useState(0)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [calorieTarget, setCalorieTarget] = useState(2000)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    const today = new Date().toISOString().split('T')[0]

    async function init() {
      try {
        const [meRes, nutritionRes, progressRes] = await Promise.all([
          fetch('/api/users/me', { signal: controller.signal }),
          fetch(`/api/nutrition?date=${today}`, { signal: controller.signal }),
          fetch(`/api/daily-progress?date=${today}`, { signal: controller.signal }),
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

        if (progressRes.ok) {
          const progress = await progressRes.json()
          setWaterMl(progress.waterMl ?? 0)
          setWorkoutDone(progress.workoutCompleted ?? false)
          setCalorieTarget(progress.calorieTarget ?? 2000)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    init()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const mode = detectMode(text)
    const progress: ProgressContext = {
      streak_day: challengeDay ?? 1,
      water_intake_ml: waterMl,
      workout_1_completed: workoutDone,
      workout_2_completed: false,
      calories_consumed: todayCalories,
      daily_calorie_target: calorieTarget,
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode, todayProgress: progress }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content: data.error ?? 'Something went wrong.' }])
        return
      }

      const aiMsg: Message = { id: crypto.randomUUID(), role: 'ai', content: data.message, macros: data.macros ?? undefined }
      setMessages(prev => [...prev, aiMsg])

      if (data.macros) {
        const m = data.macros as MacroData
        setTodayCalories(prev => prev + (m.calories ?? 0))
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
        }).catch(err => console.error('[LabAI] Nutrition POST failed:', err))
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'ai', content: 'LabAI is unavailable right now. Try again shortly.' },
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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        aria-label={open ? 'Close LabAI' : 'Open LabAI coach'}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        <span className="text-sm font-semibold">{open ? 'Close' : 'LabAI'}</span>
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
            {messages.map((msg) => (
              <div key={msg.id}>
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
