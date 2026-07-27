import { describe, it, expect, vi, beforeEach } from 'vitest'

// The coach / food-log text path walks TEXT_MODELS for the same reason the photo
// scanner walks VISION_MODELS: OpenRouter retires slugs with no notice, and an
// empty or failed reply here makes the app log a 0-calorie meal. A dead or silent
// model must fall through to the next; only a total outage may throw.

const { create } = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create } }
  },
}))

import { completeCoachChat, TEXT_MODELS } from './ai'

const reply = (content: string) => ({ choices: [{ message: { content } }] })
const modelsCalled = () => create.mock.calls.map((c) => c[0].model)

beforeEach(() => {
  create.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('completeCoachChat — model chain', () => {
  it('declares more than one model so a single retirement cannot break food logging', () => {
    expect(TEXT_MODELS.length).toBeGreaterThan(1)
  })

  it('leads with a model that reliably emits the macros tag, not llama-3.1-8b', () => {
    // llama-3.1-8b benchmarked at 1/10 sane estimates and sometimes omitted the
    // tag entirely; it may remain as a fallback but must never be first.
    expect(TEXT_MODELS[0]).not.toBe('meta-llama/llama-3.1-8b-instruct')
  })

  it('returns the first model reply and does not call the fallbacks', async () => {
    create.mockResolvedValue(reply('Nice work. <macros>{"calories":320}</macros>'))
    const out = await completeCoachChat('sys', 'two eggs', 512)
    expect(out).toContain('<macros>')
    expect(modelsCalled()).toEqual([TEXT_MODELS[0]])
  })

  it('passes the system prompt, message and token budget through unchanged', async () => {
    create.mockResolvedValue(reply('ok'))
    await completeCoachChat('SYSTEM', 'MESSAGE', 900)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 900,
        messages: [
          { role: 'system', content: 'SYSTEM' },
          { role: 'user', content: 'MESSAGE' },
        ],
      })
    )
  })

  it('falls through when a slug is retired (404 No endpoints found)', async () => {
    create
      .mockRejectedValueOnce(new Error('404 No endpoints found for retired/model.'))
      .mockResolvedValueOnce(reply('recovered'))
    expect(await completeCoachChat('sys', 'hi', 512)).toBe('recovered')
    expect(modelsCalled()).toEqual([TEXT_MODELS[0], TEXT_MODELS[1]])
  })

  it('treats an empty reply as a failure and falls through', async () => {
    create.mockResolvedValueOnce(reply('')).mockResolvedValueOnce(reply('recovered'))
    expect(await completeCoachChat('sys', 'hi', 512)).toBe('recovered')
    expect(modelsCalled()).toEqual([TEXT_MODELS[0], TEXT_MODELS[1]])
  })

  it('throws only after every model failed, having tried them all', async () => {
    create.mockRejectedValue(new Error('provider down'))
    await expect(completeCoachChat('sys', 'hi', 512)).rejects.toThrow('provider down')
    expect(modelsCalled()).toEqual([...TEXT_MODELS])
  })
})
