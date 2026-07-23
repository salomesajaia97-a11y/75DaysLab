import { describe, it, expect } from 'vitest'
import {
  sniffImageFormat,
  readImageDimensions,
  validateImage,
  MAX_UPLOAD_BYTES,
  MIN_DIMENSION,
  MAX_DIMENSION,
} from './image-validation'

// --- Synthetic image builders (valid headers, minimal bodies) -----------------

function png(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(24)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0) // signature
  buf.set([0x00, 0x00, 0x00, 0x0d], 8) // IHDR length
  buf.set([0x49, 0x48, 0x44, 0x52], 12) // "IHDR"
  const dv = new DataView(buf.buffer)
  dv.setUint32(16, width, false)
  dv.setUint32(20, height, false)
  return buf
}

function gif(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(13)
  buf.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0) // "GIF89a"
  const dv = new DataView(buf.buffer)
  dv.setUint16(6, width, true)
  dv.setUint16(8, height, true)
  return buf
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI + APP0(JFIF) + SOF0 + EOI
  const buf = new Uint8Array(30)
  let o = 0
  buf.set([0xff, 0xd8], o) // SOI
  o += 2
  buf.set([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00], o) // APP0, len=4, 2 payload bytes
  o += 6
  buf.set([0xff, 0xc0, 0x00, 0x11, 0x08], o) // SOF0, len=17, precision=8
  o += 5
  const dv = new DataView(buf.buffer)
  dv.setUint16(o, height, false)
  dv.setUint16(o + 2, width, false)
  return buf
}

function webpLossy(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30)
  buf.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  buf.set([0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  buf.set([0x56, 0x50, 0x38, 0x20], 12) // "VP8 "
  buf.set([0x9d, 0x01, 0x2a], 23) // start code
  const dv = new DataView(buf.buffer)
  dv.setUint16(26, width & 0x3fff, true)
  dv.setUint16(28, height & 0x3fff, true)
  return buf
}

function webpLossless(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30)
  buf.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  buf.set([0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  buf.set([0x56, 0x50, 0x38, 0x4c], 12) // "VP8L"
  buf[20] = 0x2f // signature
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14)
  const dv = new DataView(buf.buffer)
  dv.setUint32(21, bits >>> 0, true)
  return buf
}

function webpExtended(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30)
  buf.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  buf.set([0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  buf.set([0x56, 0x50, 0x38, 0x58], 12) // "VP8X"
  const w = width - 1
  const h = height - 1
  buf[24] = w & 0xff
  buf[25] = (w >> 8) & 0xff
  buf[26] = (w >> 16) & 0xff
  buf[27] = h & 0xff
  buf[28] = (h >> 8) & 0xff
  buf[29] = (h >> 16) & 0xff
  return buf
}

// --- sniffImageFormat ---------------------------------------------------------

describe('sniffImageFormat', () => {
  it('detects each supported format from magic bytes', () => {
    expect(sniffImageFormat(jpeg(100, 100))).toBe('jpeg')
    expect(sniffImageFormat(png(100, 100))).toBe('png')
    expect(sniffImageFormat(gif(100, 100))).toBe('gif')
    expect(sniffImageFormat(webpLossy(100, 100))).toBe('webp')
    expect(sniffImageFormat(webpLossless(100, 100))).toBe('webp')
    expect(sniffImageFormat(webpExtended(100, 100))).toBe('webp')
  })

  it('recognizes the legacy GIF87a signature', () => {
    const g = gif(100, 100)
    g.set([0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 0) // "GIF87a"
    expect(sniffImageFormat(g)).toBe('gif')
  })

  it('returns null for non-image bytes (text, PDF, empty)', () => {
    expect(sniffImageFormat(new TextEncoder().encode('hello world, not an image'))).toBeNull()
    expect(sniffImageFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull() // "%PDF"
    expect(sniffImageFormat(new Uint8Array([]))).toBeNull()
  })

  it('does not confuse a RIFF file that is not WebP (e.g. a WAV)', () => {
    const wav = new Uint8Array(12)
    wav.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
    wav.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"
    expect(sniffImageFormat(wav)).toBeNull()
  })
})

// --- readImageDimensions ------------------------------------------------------

describe('readImageDimensions', () => {
  it('reads dimensions for every format', () => {
    expect(readImageDimensions(png(640, 480), 'png')).toEqual({ width: 640, height: 480 })
    expect(readImageDimensions(gif(320, 200), 'gif')).toEqual({ width: 320, height: 200 })
    expect(readImageDimensions(jpeg(1024, 768), 'jpeg')).toEqual({ width: 1024, height: 768 })
    expect(readImageDimensions(webpLossy(800, 600), 'webp')).toEqual({ width: 800, height: 600 })
    expect(readImageDimensions(webpLossless(800, 600), 'webp')).toEqual({ width: 800, height: 600 })
    expect(readImageDimensions(webpExtended(4000, 3000), 'webp')).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it('returns null for truncated headers', () => {
    expect(readImageDimensions(png(100, 100).slice(0, 20), 'png')).toBeNull()
    expect(readImageDimensions(gif(100, 100).slice(0, 6), 'gif')).toBeNull()
    expect(readImageDimensions(new Uint8Array([0xff, 0xd8, 0xff]), 'jpeg')).toBeNull()
  })
})

// --- validateImage ------------------------------------------------------------

describe('validateImage', () => {
  it('accepts a valid image and returns its format + dimensions', () => {
    const res = validateImage(png(800, 600))
    expect(res).toEqual({ ok: true, format: 'png', width: 800, height: 600 })
  })

  it('rejects an empty buffer', () => {
    const res = validateImage(new Uint8Array([]))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('empty')
  })

  it('rejects oversized files before inspecting content', () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1)
    big.set(jpeg(100, 100).subarray(0, 3), 0)
    const res = validateImage(big)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('too-large')
  })

  it('rejects a renamed non-image (magic bytes win over any extension/MIME)', () => {
    const fake = new TextEncoder().encode('This is a .jpg in name only')
    const res = validateImage(fake)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('unsupported-format')
  })

  it('rejects a corrupt image (valid signature, unreadable dimensions)', () => {
    const truncated = png(100, 100).slice(0, 16) // sig + IHDR tag but no dims
    const res = validateImage(truncated)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('corrupt')
  })

  it('rejects images below the minimum dimension', () => {
    const res = validateImage(png(MIN_DIMENSION - 1, MIN_DIMENSION - 1))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('too-small')
  })

  it('rejects images above the maximum dimension', () => {
    const res = validateImage(webpExtended(MAX_DIMENSION + 1, 100))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('too-big-dimensions')
  })

  it('accepts exactly at the dimension boundaries', () => {
    expect(validateImage(png(MIN_DIMENSION, MIN_DIMENSION)).ok).toBe(true)
    expect(validateImage(webpExtended(MAX_DIMENSION, MAX_DIMENSION)).ok).toBe(true)
  })

  it('honors custom option overrides', () => {
    const res = validateImage(png(800, 600), { maxDimension: 500 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('too-big-dimensions')
  })

  it('always surfaces a user-friendly message on failure', () => {
    const res = validateImage(new TextEncoder().encode('nope'))
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.message).toMatch(/JPEG, PNG, WebP, or GIF/)
      expect(res.message).not.toMatch(/undefined|null|Error/)
    }
  })
})
