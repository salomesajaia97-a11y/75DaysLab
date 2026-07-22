// One-time, per-user legacy-storage migration policy.
//
// Pre-Phase-1 progress lived in GLOBAL (un-namespaced) localStorage keys such
// as `75lab_streak` and `75lab_daily_<date>`. That data is:
//   - unverified self-report (never checked against 75-Hard completion rules)
//   - un-attributable (global keys aren't owned by any authenticated user, so
//     on a shared browser they may belong to a different account)
//   - superseded — completion/streak are now server-authoritative
//
// Therefore the ONLY safe policy is Option C: PRESERVE the legacy keys (already
// done — clearUserScopedStorage no longer deletes un-namespaced keys) but do
// NOT import them into the server model. Importing would either fabricate
// verified `allComplete` days from an aggregate streak or mis-attribute another
// user's data. This runs once per authenticated user (idempotent via a
// per-user, versioned marker) and never writes server state.

export const LEGACY_MIGRATION_VERSION = 1
const MARKER_BASE = '75lab_legacyMigration'

/** Minimal Storage surface (localStorage-compatible). */
export interface KVStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type MigrationStatus = 'skipped-no-user' | 'already' | 'completed'

export interface MigrationResult {
  status: MigrationStatus
  version: number
  /** count imported into the server model — always 0 under Option C. */
  imported: number
  note?: string
}

function markerKey(uid: string): string {
  return `${MARKER_BASE}::${uid}`
}

/** Has the current-version migration already run for this user? */
export function hasMigrated(uid: string, store: KVStore): boolean {
  return store.getItem(markerKey(uid)) === String(LEGACY_MIGRATION_VERSION)
}

/**
 * Evaluate legacy data for the authenticated user and record the (idempotent)
 * migration marker. Conservative Option C: never imports, never attributes,
 * never writes server state, never deletes legacy keys. Returns what happened.
 */
export function runLegacyMigration(uid: string | null | undefined, store: KVStore): MigrationResult {
  // Never attribute anonymous/global legacy data without an authenticated user.
  if (!uid) return { status: 'skipped-no-user', version: LEGACY_MIGRATION_VERSION, imported: 0 }

  if (hasMigrated(uid, store)) {
    return { status: 'already', version: LEGACY_MIGRATION_VERSION, imported: 0 }
  }

  // Policy: do NOT import. Legacy aggregate streak / self-reported task toggles
  // cannot be converted into verified server completions, and global keys can't
  // be safely attributed to this account. Record completion and stop.
  store.setItem(markerKey(uid), String(LEGACY_MIGRATION_VERSION))
  return {
    status: 'completed',
    version: LEGACY_MIGRATION_VERSION,
    imported: 0,
    note: 'legacy data preserved, not imported (unverified + unattributable)',
  }
}
