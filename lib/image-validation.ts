// Server-side image upload validation — pure, dependency-free, unit-testable.
//
// The client-provided MIME type (File.type) and filename are UNTRUSTED. This
// module identifies the real format from the file's magic bytes and reads the
// pixel dimensions straight from the container headers, so a renamed non-image
// (or a corrupted file) is rejected before it ever reaches storage.

/** Formats we accept for progress photos. */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif'

/** Maximum accepted upload size (10 MB). Oversized files are rejected up-front. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Reject absurdly small images (likely not a real progress photo / corrupt). */
export const MIN_DIMENSION = 32

/** Reject images larger than Cloudinary's free-tier practical limit. */
export const MAX_DIMENSION = 12_000

/** Human-readable label per format, for friendly error messages. */
const FORMAT_LABEL: Record<ImageFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  gif: 'GIF',
}

export type ValidationFailure =
  | 'empty'
  | 'too-large'
  | 'unsupported-format'
  | 'corrupt'
  | 'too-small'
  | 'too-big-dimensions'

export type ValidationResult =
  | { ok: true; format: ImageFormat; width: number; height: number }
  | { ok: false; reason: ValidationFailure; message: string }

interface ValidateOptions {
  maxBytes?: number
  minDimension?: number
  maxDimension?: number
}

/** ASCII match helper — compares bytes at `offset` against a string. */
function matchAscii(buf: Uint8Array, offset: number, ascii: string): boolean {
  if (offset + ascii.length > buf.length) return false
  for (let i = 0; i < ascii.length; i++) {
    if (buf[offset + i] !== ascii.charCodeAt(i)) return false
  }
  return true
}

/**
 * Identify the real image format from the leading magic bytes. Returns null for
 * anything that is not one of the supported image containers — including a
 * text/PDF/zip file that has merely been renamed to `.jpg`.
 */
export function sniffImageFormat(buf: Uint8Array): ImageFormat | null {
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'png'

  // GIF: "GIF87a" or "GIF89a"
  if (matchAscii(buf, 0, 'GIF87a') || matchAscii(buf, 0, 'GIF89a')) return 'gif'

  // WebP: "RIFF" .... "WEBP"
  if (matchAscii(buf, 0, 'RIFF') && matchAscii(buf, 8, 'WEBP')) return 'webp'

  return null
}

function readDimensionsPng(buf: Uint8Array): { width: number; height: number } | null {
  // 8-byte signature, 4-byte chunk length, "IHDR", then width/height as BE u32.
  if (buf.length < 24 || !matchAscii(buf, 12, 'IHDR')) return null
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const width = dv.getUint32(16, false)
  const height = dv.getUint32(20, false)
  return { width, height }
}

function readDimensionsGif(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 10) return null
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const width = dv.getUint16(6, true) // little-endian
  const height = dv.getUint16(8, true)
  return { width, height }
}

function readDimensionsWebp(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 30) return null
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  // Lossy: "VP8 " chunk. Frame header starts at 20; 3-byte start code at 23.
  if (matchAscii(buf, 12, 'VP8 ')) {
    if (buf.length < 30) return null
    // Dimensions are 14-bit, little-endian, at offsets 26 and 28.
    const width = dv.getUint16(26, true) & 0x3fff
    const height = dv.getUint16(28, true) & 0x3fff
    return width && height ? { width, height } : null
  }

  // Lossless: "VP8L" chunk. Signature byte 0x2f at offset 20, then 4 bytes hold
  // (14-bit width-1) and (14-bit height-1).
  if (matchAscii(buf, 12, 'VP8L')) {
    if (buf.length < 25 || buf[20] !== 0x2f) return null
    const bits = dv.getUint32(21, true)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >> 14) & 0x3fff) + 1
    return { width, height }
  }

  // Extended: "VP8X" chunk. Canvas dims are 3-byte LE (value-1) at 24 and 27.
  if (matchAscii(buf, 12, 'VP8X')) {
    if (buf.length < 30) return null
    const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
    const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
    return { width, height }
  }

  return null
}

function readDimensionsJpeg(buf: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // Walk the marker segments looking for a Start-Of-Frame (SOFn) marker.
  let offset = 2 // skip the SOI (FF D8)
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null // markers must be byte-aligned; corrupt otherwise
    const marker = buf[offset + 1]
    // Standalone markers with no length payload.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    const segLength = dv.getUint16(offset + 2, false)
    if (segLength < 2) return null
    // SOF0-SOF15, excluding DHT(C4), JPG(C8), DAC(CC) — those aren't frame headers.
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      // SOF payload: precision(1), height(2 BE), width(2 BE).
      if (offset + 9 > buf.length) return null
      const height = dv.getUint16(offset + 5, false)
      const width = dv.getUint16(offset + 7, false)
      return { width, height }
    }
    offset += 2 + segLength
  }
  return null
}

/**
 * Read pixel dimensions for a known format directly from its header. Returns
 * null when the bytes are truncated or malformed (i.e. a corrupt image).
 */
export function readImageDimensions(
  buf: Uint8Array,
  format: ImageFormat
): { width: number; height: number } | null {
  switch (format) {
    case 'png':
      return readDimensionsPng(buf)
    case 'gif':
      return readDimensionsGif(buf)
    case 'webp':
      return readDimensionsWebp(buf)
    case 'jpeg':
      return readDimensionsJpeg(buf)
  }
}

/**
 * Validate an uploaded image buffer end-to-end. Never trusts client metadata:
 * format is sniffed from magic bytes and dimensions are read from the header.
 */
export function validateImage(buf: Uint8Array, opts: ValidateOptions = {}): ValidationResult {
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES
  const minDim = opts.minDimension ?? MIN_DIMENSION
  const maxDim = opts.maxDimension ?? MAX_DIMENSION

  if (buf.length === 0) {
    return { ok: false, reason: 'empty', message: 'The uploaded file is empty.' }
  }
  if (buf.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return {
      ok: false,
      reason: 'too-large',
      message: `Image is too large. Maximum size is ${mb} MB.`,
    }
  }

  const format = sniffImageFormat(buf)
  if (!format) {
    return {
      ok: false,
      reason: 'unsupported-format',
      message: 'Unsupported file. Please upload a JPEG, PNG, WebP, or GIF image.',
    }
  }

  const dims = readImageDimensions(buf, format)
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return {
      ok: false,
      reason: 'corrupt',
      message: `The ${FORMAT_LABEL[format]} image appears to be corrupted.`,
    }
  }

  if (dims.width < minDim || dims.height < minDim) {
    return {
      ok: false,
      reason: 'too-small',
      message: `Image is too small. Minimum is ${minDim}×${minDim} pixels.`,
    }
  }
  if (dims.width > maxDim || dims.height > maxDim) {
    return {
      ok: false,
      reason: 'too-big-dimensions',
      message: `Image dimensions are too large. Maximum is ${maxDim}×${maxDim} pixels.`,
    }
  }

  return { ok: true, format, width: dims.width, height: dims.height }
}
