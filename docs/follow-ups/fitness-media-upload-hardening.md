# Follow-up: Harden `POST /api/admin/fitness-media/upload`

**Status:** Open — deliberately out of scope for `fix/phase2b-photo-hardening`.
**Raised by:** Phase 2B photo-upload hardening audit (2026-07-23).
**Severity:** Medium (admin-only endpoint, so exposure is limited to authenticated admins).

## Context

Phase 2B hardened the user-facing progress-photo flow (`app/api/photos/route.ts`).
The admin fitness-media upload route (`app/api/admin/fitness-media/upload/route.ts`)
handles GIF / Lottie-JSON uploads and still has the same weaknesses the photo
route had before hardening. It was left untouched on this branch by request.

## Weaknesses observed

1. **Trusts client metadata.** Accepts a file based on `file.type` and the
   filename extension (`.json` / `.gif`) — both attacker-controlled. No
   magic-byte verification of the actual content.
2. **No size limit.** The whole body is buffered via `file.arrayBuffer()`
   regardless of size; no `Content-Length` pre-check.
3. **Raw error leak.** On failure it returns `err.message` straight to the
   client, which can surface provider/internal detail.
4. **No orphan cleanup.** Re-uploading media does not destroy a superseded
   Cloudinary asset (same storage-leak class fixed for photos in this branch).

## Suggested fix (next branch)

- Reuse the pattern from `lib/image-validation.ts`: sniff format from bytes,
  enforce a size cap, reject corrupt/unsupported files.
- For Lottie JSON, validate that the payload parses as JSON and has the expected
  top-level shape rather than trusting the `.json` extension.
- Return generic error messages; log detail server-side only.
- On replacement, destroy the previous asset (`deletePhoto` / `deleteFitnessMedia`),
  non-fatal after the new record is saved.

Do **not** fold this into `fix/phase2b-photo-hardening`.
