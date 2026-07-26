// Pure, framework-free contract for the nutrition photo-scan entry points.
// Extracted so the file-input capture behavior and the failure messaging are
// unit-testable without a DOM, and so the camera/gallery inputs can never
// silently drift apart. No React, no network, no I/O.

/** The two photo-entry sources in the Add-food sheet. */
export type PhotoSource = 'camera' | 'gallery'

/** Only real image formats are accepted by the scan API. */
export const SCAN_ACCEPT = 'image/*'

/** Generic, secret-free fallback shown when the server gives no usable message. */
export const SCAN_FALLBACK_ERROR = 'Photo scan failed. Try again or describe it.'

/**
 * Attributes for the hidden <input type="file"> behind each source.
 *  - camera  → also sets `capture="environment"`, so a mobile device opens the
 *              rear camera directly. Desktop browsers ignore `capture` and fall
 *              back to the normal file picker — never a silent failure.
 *  - gallery → no `capture`, so every platform opens the photo/file picker.
 */
export function fileInputProps(source: PhotoSource): { accept: string; capture?: 'environment' } {
  return source === 'camera'
    ? { accept: SCAN_ACCEPT, capture: 'environment' }
    : { accept: SCAN_ACCEPT }
}

/**
 * Resolve the message to show after a failed scan. The scan API already returns
 * user-safe, secret-free strings (e.g. "Image is too large…", "Couldn't analyze
 * that photo…"), so surface it; fall back to a generic line only when the
 * response carried no usable message (network error, opaque failure).
 */
export function scanErrorMessage(serverError?: unknown): string {
  return typeof serverError === 'string' && serverError.trim().length > 0
    ? serverError
    : SCAN_FALLBACK_ERROR
}
