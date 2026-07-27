// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React from 'react'

// i18n → identity so assertions read against stable keys.
vi.mock('@/lib/i18n', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: () => {} }),
}))

// framer-motion → plain divs; drop animation-only props React would warn on.
vi.mock('framer-motion', async () => {
  const R = await import('react')
  const ANIM = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout']
  const make = () =>
    R.forwardRef<HTMLDivElement, Record<string, unknown>>(function M(props, ref) {
      const rest: Record<string, unknown> = {}
      for (const k of Object.keys(props)) if (k !== 'children' && !ANIM.includes(k)) rest[k] = props[k]
      return R.createElement('div', { ref, ...rest }, props.children as React.ReactNode)
    })
  // Cache per tag so `motion.div` is a STABLE component type across renders —
  // otherwise React remounts the subtree every render and DOM node refs go stale.
  const cache = new Map<PropertyKey, unknown>()
  const motion = new Proxy(
    {},
    { get: (_t, key) => (cache.has(key) ? cache.get(key) : (cache.set(key, make()), cache.get(key))) }
  )
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  }
})

import { AddFoodSheet } from './AddFoodSheet'
import { SCAN_FALLBACK_ERROR } from '@/lib/nutrition-scan'

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as Response
}

const MACROS = { calories: 320, proteinG: 20, carbsG: 30, fatG: 10, food: 'salad' }
const fetchMock = vi.fn()

function renderSheet() {
  const onLogged = vi.fn()
  const onClose = vi.fn()
  render(<AddFoodSheet meal="breakfast" open onClose={onClose} onLogged={onLogged} />)
  return { onLogged, onClose }
}

/** Open one of the menu tiles by its (identity-mapped) label key. */
function openTile(key: 'text' | 'camera' | 'gallery') {
  fireEvent.click(screen.getByText(`recipes.add.${key}`))
}

function pickFile(name = 'meal.png', type = 'image/png') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([new Uint8Array([1, 2, 3, 4])], name, { type })
  fireEvent.change(input, { target: { files: [file] } })
  return input
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AddFoodSheet — entry options are present (camera + gallery)', () => {
  it('menu shows both a camera (Take photo) and a gallery tile', async () => {
    renderSheet()
    expect(await screen.findByText('recipes.add.camera')).toBeInTheDocument()
    expect(screen.getByText('recipes.add.gallery')).toBeInTheDocument()
  })
})

describe('AddFoodSheet — file input contract', () => {
  it('camera input requests the device camera (capture=environment, images only)', async () => {
    renderSheet()
    await screen.findByText('recipes.add.camera')
    openTile('camera')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('gallery input opens the picker (no capture, images only)', async () => {
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).not.toHaveAttribute('capture')
  })
})

describe('AddFoodSheet — scan flow', () => {
  it('successful scan shows the recognized food + macros', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { photoUrl: 'https://cdn/x.png', macros: MACROS }))
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    expect(await screen.findByText('salad')).toBeInTheDocument()
    expect(screen.getByText(/320/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/nutrition/scan', expect.objectContaining({ method: 'POST' }))
  })

  it('surfaces the safe server message on failure with Retry + manual-entry actions', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { error: "Couldn't analyze that photo. Try again or describe it." })
    )
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    expect(
      await screen.findByText("Couldn't analyze that photo. Try again or describe it.")
    ).toBeInTheDocument()
    expect(screen.getByText('nutrition.add.retry')).toBeInTheDocument()
    expect(screen.getByText('nutrition.add.describe_manually')).toBeInTheDocument()
  })

  it('shows the generic fallback (no server message) on a network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    expect(await screen.findByText(SCAN_FALLBACK_ERROR)).toBeInTheDocument()
  })

  it('Retry re-scans the same image (second request fired)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(502, { error: 'Could not process your photo right now. Please try again.' }))
      .mockResolvedValueOnce(jsonResponse(200, { photoUrl: 'https://cdn/x.png', macros: MACROS }))
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    fireEvent.click(await screen.findByText('nutrition.add.retry'))
    expect(await screen.findByText('salad')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('"Describe it instead" switches to the manual text entry', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { error: "Couldn't analyze that photo." }))
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    fireEvent.click(await screen.findByText('nutrition.add.describe_manually'))
    expect(await screen.findByPlaceholderText('nutrition.add.text_placeholder')).toBeInTheDocument()
  })

  it('rejects an unsupported file type via the server message (415)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(415, { error: 'Unsupported image format.' }))
    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile('note.txt', 'text/plain')
    expect(await screen.findByText('Unsupported image format.')).toBeInTheDocument()
  })

  it('prevents duplicate submits while a scan is in flight', async () => {
    let resolveScan!: (v: Response) => void
    const pending = new Promise<Response>((res) => { resolveScan = res })
    fetchMock.mockReturnValueOnce(pending)

    renderSheet()
    await screen.findByText('recipes.add.gallery')
    openTile('gallery')
    pickFile()
    // While scanning, the input is disabled and a second selection is ignored.
    const liveInput = () => document.querySelector('input[type="file"]') as HTMLInputElement
    await waitFor(() => expect(liveInput()).toBeDisabled())
    fireEvent.change(liveInput(), { target: { files: [new File([new Uint8Array([9])], 'again.png', { type: 'image/png' })] } })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveScan(jsonResponse(200, { photoUrl: 'https://cdn/x.png', macros: MACROS }))
    expect(await screen.findByText('salad')).toBeInTheDocument()
  })
})
