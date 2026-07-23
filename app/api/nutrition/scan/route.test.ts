import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { MAX_UPLOAD_BYTES } from '@/lib/image-validation'

// The nutrition scan endpoint gets the same server-side upload hardening as the
// photos route: it validates the image from its real bytes (never client
// metadata), never leaks provider errors, and cleans up the uploaded Cloudinary
// asset whenever it cannot return a usable result. On success the asset is
// intentionally retained (the food-log save flow persists photoUrl).

const { auth, uploadPhoto, deletePhoto, parseFoodPhoto } = vi.hoisted(() => ({
  auth: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  parseFoodPhoto: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/cloudinary', () => ({ uploadPhoto, deletePhoto }))
vi.mock('@/lib/ai', () => ({ parseFoodPhoto }))

import { POST } from './route'

const USER = '507f1f77bcf86cd799439011'
const MACROS = { calories: 320, proteinG: 20, carbsG: 30, fatG: 10, food: 'salad' }

function validPng(width = 800, height = 600): Uint8Array {
  const buf = new Uint8Array(24)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  buf.set([0x00, 0x00, 0x00, 0x0d], 8)
  buf.set([0x49, 0x48, 0x44, 0x52], 12)
  const dv = new DataView(buf.buffer)
  dv.setUint32(16, width, false)
  dv.setUint32(20, height, false)
  return buf
}

function makeRequest(
  image?: Uint8Array | string,
  headers: Record<string, string> = {}
): NextRequest {
  const form = new FormData()
  if (image !== undefined) {
    if (typeof image === 'string') {
      form.append('image', image)
    } else {
      const ab = new ArrayBuffer(image.byteLength)
      new Uint8Array(ab).set(image)
      form.append('image', new File([ab], 'meal.png', { type: 'image/png' }))
    }
  }
  return new NextRequest('http://localhost/api/nutrition/scan', {
    method: 'POST',
    body: form,
    headers,
  })
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: USER } })
  uploadPhoto.mockReset().mockResolvedValue({ url: 'https://cdn/food.png', publicId: 'pid-food' })
  deletePhoto.mockReset().mockResolvedValue(undefined)
  parseFoodPhoto.mockReset().mockResolvedValue(MACROS)
})

describe('POST /api/nutrition/scan — auth', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(401)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })
})

describe('POST /api/nutrition/scan — image content validation (never trusts metadata)', () => {
  it('400 when the image field is missing', async () => {
    const res = await POST(makeRequest(undefined))
    expect(res.status).toBe(400)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('415 for a renamed non-image (declares image/png, bytes are text)', async () => {
    const fake = new TextEncoder().encode('not an image at all')
    const res = await POST(makeRequest(fake))
    expect(res.status).toBe(415)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('422 for a corrupted image (valid signature, unreadable dimensions)', async () => {
    const res = await POST(makeRequest(validPng().slice(0, 16)))
    expect(res.status).toBe(422)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('422 for an image below the minimum dimension', async () => {
    const res = await POST(makeRequest(validPng(10, 10)))
    expect(res.status).toBe(422)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('413 (Content-Length pre-check) for an oversized body before buffering', async () => {
    const res = await POST(
      makeRequest(validPng(), { 'content-length': String(MAX_UPLOAD_BYTES + 5000) })
    )
    expect(res.status).toBe(413)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })
})

describe('POST /api/nutrition/scan — provider failures (cleanup, no leak)', () => {
  it('502 with a generic message when Cloudinary fails (no internals leaked)', async () => {
    uploadPhoto.mockRejectedValue(new Error('Cloudinary api_key=secret123 rejected'))
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toMatch(/api_key|secret123|Cloudinary/)
  })

  it('cleans up the uploaded asset and 422s when the AI provider throws', async () => {
    parseFoodPhoto.mockRejectedValue(new Error('openai 500 key=leak'))
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(422)
    expect(deletePhoto).toHaveBeenCalledWith('pid-food')
    const body = await res.json()
    expect(JSON.stringify(body)).not.toMatch(/openai|leak|key=/)
  })

  it('cleans up the uploaded asset and 422s when analysis yields no macros', async () => {
    parseFoodPhoto.mockResolvedValue(null)
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(422)
    expect(deletePhoto).toHaveBeenCalledWith('pid-food')
  })

  it('still 422s (does not crash) when cleanup itself fails', async () => {
    parseFoodPhoto.mockResolvedValue(null)
    deletePhoto.mockRejectedValue(new Error('destroy failed'))
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(422)
  })
})

describe('POST /api/nutrition/scan — success', () => {
  it('200 with { photoUrl, macros } and RETAINS the asset (no cleanup)', async () => {
    const res = await POST(makeRequest(validPng()))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ photoUrl: 'https://cdn/food.png', macros: MACROS })
    expect(deletePhoto).not.toHaveBeenCalled()
  })
})
