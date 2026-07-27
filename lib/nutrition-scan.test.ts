import { describe, it, expect } from 'vitest'
import {
  fileInputProps,
  scanErrorMessage,
  SCAN_ACCEPT,
  SCAN_FALLBACK_ERROR,
} from './nutrition-scan'

describe('fileInputProps — camera vs gallery input contract', () => {
  it('camera requests the device camera (capture=environment) and images only', () => {
    expect(fileInputProps('camera')).toEqual({ accept: SCAN_ACCEPT, capture: 'environment' })
    expect(SCAN_ACCEPT).toBe('image/*')
  })

  it('gallery opens the picker (no capture) and images only', () => {
    const props = fileInputProps('gallery')
    expect(props).toEqual({ accept: SCAN_ACCEPT })
    expect('capture' in props).toBe(false)
  })
})

describe('scanErrorMessage — surface the safe server message, never a secret', () => {
  it('prefers a non-empty server-provided message', () => {
    expect(scanErrorMessage('Image is too large. Maximum size is 8 MB.')).toBe(
      'Image is too large. Maximum size is 8 MB.'
    )
    expect(scanErrorMessage("Couldn't analyze that photo. Try again or describe it.")).toBe(
      "Couldn't analyze that photo. Try again or describe it."
    )
  })

  it('falls back to the generic line for empty/whitespace/absent/non-string input', () => {
    expect(scanErrorMessage(undefined)).toBe(SCAN_FALLBACK_ERROR)
    expect(scanErrorMessage('')).toBe(SCAN_FALLBACK_ERROR)
    expect(scanErrorMessage('   ')).toBe(SCAN_FALLBACK_ERROR)
    expect(scanErrorMessage(null)).toBe(SCAN_FALLBACK_ERROR)
    expect(scanErrorMessage({ secret: 'leak' })).toBe(SCAN_FALLBACK_ERROR)
  })
})
