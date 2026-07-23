import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { MAX_UPLOAD_BYTES } from '@/lib/image-validation'

// The photos POST handler hardens the upload flow: it validates the file from
// its real bytes (never client metadata), upserts on {userId,dayNumber} so a
// re-upload replaces rather than duplicates, drives the daily-completion
// recompute, and never leaks storage internals or crashes on failure.

const { auth, connectDB, findOneAndUpdate, uploadPhoto, deletePhoto, recomputeDailyLog } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    connectDB: vi.fn().mockResolvedValue(undefined),
    findOneAndUpdate: vi.fn(),
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    recomputeDailyLog: vi.fn(),
  }))

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/mongoose', () => ({ connectDB }))
vi.mock('@/models/Photo', () => ({ Photo: { findOneAndUpdate, find: vi.fn() } }))
vi.mock('@/lib/cloudinary', () => ({ uploadPhoto, deletePhoto }))
vi.mock('@/lib/recompute-daily-log', () => ({ recomputeDailyLog }))

import { POST } from './route'

const VALID_USER_ID = '507f1f77bcf86cd799439011'

// A minimal but structurally-valid 800x600 PNG (signature + IHDR).
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
  parts: { photo?: Uint8Array | string; dayNumber?: unknown },
  headers: Record<string, string> = {}
): NextRequest {
  const form = new FormData()
  if (parts.photo !== undefined) {
    if (typeof parts.photo === 'string') {
      form.append('photo', parts.photo)
    } else {
      const ab = new ArrayBuffer(parts.photo.byteLength)
      new Uint8Array(ab).set(parts.photo)
      form.append('photo', new File([ab], 'progress.png', { type: 'image/png' }))
    }
  }
  if (parts.dayNumber !== undefined) form.append('dayNumber', String(parts.dayNumber))
  return new NextRequest('http://localhost/api/photos', {
    method: 'POST',
    body: form,
    headers,
  })
}

beforeEach(() => {
  auth.mockReset()
  connectDB.mockClear()
  findOneAndUpdate.mockReset()
  uploadPhoto.mockReset()
  deletePhoto.mockReset()
  recomputeDailyLog.mockReset()

  auth.mockResolvedValue({ user: { id: VALID_USER_ID } })
  uploadPhoto.mockResolvedValue({ url: 'https://cdn/photo.png', publicId: 'pid-new' })
  // Default: no prior photo for the day (first upload → upsert returns null).
  findOneAndUpdate.mockResolvedValue(null)
  deletePhoto.mockResolvedValue(undefined)
  recomputeDailyLog.mockResolvedValue({ log: {}, challenge: null })
})

describe('POST /api/photos — auth', () => {
  it('401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 1 }))
    expect(res.status).toBe(401)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('401 when the session id is not a valid ObjectId', async () => {
    auth.mockResolvedValue({ user: { id: 'not-an-objectid' } })
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 1 }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/photos — request validation', () => {
  it('400 when the photo field is missing', async () => {
    const res = await POST(makeRequest({ dayNumber: 1 }))
    expect(res.status).toBe(400)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('400 when the photo field is a plain string, not a file', async () => {
    const res = await POST(makeRequest({ photo: 'just text', dayNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it.each([0, -1, 1.5, 1001, NaN])('400 for out-of-range dayNumber %s', async (day) => {
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: day }))
    expect(res.status).toBe(400)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })
})

describe('POST /api/photos — image content validation (never trusts metadata)', () => {
  it('415 for a renamed non-image (declares image/png, bytes are text)', async () => {
    const fake = new TextEncoder().encode('I am definitely not a PNG')
    const res = await POST(makeRequest({ photo: fake, dayNumber: 1 }))
    expect(res.status).toBe(415)
    expect(uploadPhoto).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.error).toMatch(/JPEG, PNG, WebP, or GIF/)
  })

  it('422 for a corrupt image (valid signature, no readable dimensions)', async () => {
    const res = await POST(makeRequest({ photo: validPng().slice(0, 16), dayNumber: 1 }))
    expect(res.status).toBe(422)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('422 for an image below the minimum dimension', async () => {
    const res = await POST(makeRequest({ photo: validPng(10, 10), dayNumber: 1 }))
    expect(res.status).toBe(422)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })

  it('413 (Content-Length pre-check) rejects an oversized body before buffering', async () => {
    const res = await POST(
      makeRequest({ photo: validPng(), dayNumber: 1 }, { 'content-length': String(MAX_UPLOAD_BYTES + 5000) })
    )
    expect(res.status).toBe(413)
    expect(uploadPhoto).not.toHaveBeenCalled()
  })
})

describe('POST /api/photos — success, dedup & recompute', () => {
  it('201 on a valid upload and returns the stored url', async () => {
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ url: 'https://cdn/photo.png' })
    expect(uploadPhoto).toHaveBeenCalledWith(expect.any(Buffer), `75dayslab/${VALID_USER_ID}`)
  })

  it('upserts on {userId,dayNumber} so a re-upload replaces, not duplicates', async () => {
    await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: VALID_USER_ID, dayNumber: 5 },
      expect.objectContaining({ url: 'https://cdn/photo.png', publicId: 'pid-new' }),
      expect.objectContaining({ upsert: true, new: false })
    )
  })

  it('does NOT destroy any asset on a first upload (no prior photo)', async () => {
    findOneAndUpdate.mockResolvedValue(null)
    await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(deletePhoto).not.toHaveBeenCalled()
  })

  it('destroys the orphaned previous asset when a day is re-uploaded', async () => {
    findOneAndUpdate.mockResolvedValue({ url: 'https://cdn/old.png', publicId: 'pid-old' })
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(res.status).toBe(201)
    expect(deletePhoto).toHaveBeenCalledWith('pid-old')
  })

  it('does not destroy when the previous publicId is unchanged', async () => {
    findOneAndUpdate.mockResolvedValue({ url: 'https://cdn/x.png', publicId: 'pid-new' })
    await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(deletePhoto).not.toHaveBeenCalled()
  })

  it('still returns 201 when orphan cleanup throws (non-fatal)', async () => {
    findOneAndUpdate.mockResolvedValue({ url: 'https://cdn/old.png', publicId: 'pid-old' })
    deletePhoto.mockRejectedValue(new Error('destroy failed'))
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(res.status).toBe(201)
  })

  it('triggers the daily-log recompute for the upload date', async () => {
    await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(recomputeDailyLog).toHaveBeenCalledWith(VALID_USER_ID, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('still returns 201 when the recompute throws (non-fatal)', async () => {
    recomputeDailyLog.mockRejectedValue(new Error('spine down'))
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 5 }))
    expect(res.status).toBe(201)
  })
})

describe('POST /api/photos — error handling (no crash, no leak)', () => {
  it('502 with a generic message when Cloudinary fails (no internals leaked)', async () => {
    uploadPhoto.mockRejectedValue(new Error('Cloudinary secret api_key=abc123 rejected'))
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 1 }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).not.toMatch(/api_key|Cloudinary|abc123/)
    expect(body.error).toMatch(/try again/i)
  })

  it('500 with a generic message when the DB write fails', async () => {
    findOneAndUpdate.mockRejectedValue(new Error('E11000 duplicate key ... connection string leak'))
    const res = await POST(makeRequest({ photo: validPng(), dayNumber: 1 }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toMatch(/E11000|connection string/)
  })
})
