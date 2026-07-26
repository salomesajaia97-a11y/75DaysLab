import { describe, it, expect, vi, beforeEach } from 'vitest'

// OpenRouter retires vision model slugs without warning, and every retirement so
// far has silently broken photo scanning (the `:free` model went 404/429, then
// llama-3.2-11b-vision started answering "No endpoints found"). parseFoodPhoto
// therefore walks a chain of models: a dead slug or a garbled reply must fall
// through to the next one, while a real "not food" verdict must stop the chain.

const { create } = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create } }
  },
}))

import { parseFoodPhoto, VISION_MODELS } from './ai'

const reply = (content: string) => ({ choices: [{ message: { content } }] })
const MACRO_TAG =
  '<macros>{"calories":640,"proteinG":55,"carbsG":14,"fatG":42,"food":"baked salmon"}</macros>'

const modelsCalled = () => create.mock.calls.map((c) => c[0].model)

beforeEach(() => {
  create.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('parseFoodPhoto — model chain', () => {
  it('declares more than one model so a single retirement cannot break scanning', () => {
    expect(VISION_MODELS.length).toBeGreaterThan(1)
  })

  it('returns macros from the first model and does not call the fallbacks', async () => {
    create.mockResolvedValue(reply(MACRO_TAG))
    const macros = await parseFoodPhoto('https://cdn/food.jpg')
    expect(macros).toEqual({
      calories: 640,
      proteinG: 55,
      carbsG: 14,
      fatG: 42,
      food: 'baked salmon',
    })
    expect(modelsCalled()).toEqual([VISION_MODELS[0]])
  })

  it('falls through to the next model when a slug is retired (404 No endpoints found)', async () => {
    create
      .mockRejectedValueOnce(new Error('404 No endpoints found for retired/model.'))
      .mockResolvedValueOnce(reply(MACRO_TAG))
    const macros = await parseFoodPhoto('https://cdn/food.jpg')
    expect(macros?.calories).toBe(640)
    expect(modelsCalled()).toEqual([VISION_MODELS[0], VISION_MODELS[1]])
  })

  it('falls through when a model answers with a garbled, unparseable tag', async () => {
    create
      .mockResolvedValueOnce(reply('macrosories":500,"proteinG":carbsG":10'))
      .mockResolvedValueOnce(reply(MACRO_TAG))
    const macros = await parseFoodPhoto('https://cdn/food.jpg')
    expect(macros?.food).toBe('baked salmon')
    expect(modelsCalled()).toEqual([VISION_MODELS[0], VISION_MODELS[1]])
  })

  it('stops at a real "not food" verdict instead of retrying other models', async () => {
    create.mockResolvedValue(
      reply('<macros>{"calories":0,"proteinG":0,"carbsG":0,"fatG":0,"food":"not food"}</macros>')
    )
    expect(await parseFoodPhoto('https://cdn/rock.jpg')).toBeNull()
    expect(modelsCalled()).toEqual([VISION_MODELS[0]])
  })

  it('returns null after every model fails, having tried them all', async () => {
    create.mockRejectedValue(new Error('provider down'))
    expect(await parseFoodPhoto('https://cdn/food.jpg')).toBeNull()
    expect(modelsCalled()).toEqual([...VISION_MODELS])
  })

  it('never lets a provider error escape to the caller', async () => {
    create.mockRejectedValue(new Error('401 invalid api key sk-or-v1-leak'))
    await expect(parseFoodPhoto('https://cdn/food.jpg')).resolves.toBeNull()
  })
})
