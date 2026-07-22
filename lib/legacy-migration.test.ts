import { describe, it, expect } from 'vitest'
import { runLegacyMigration, hasMigrated, LEGACY_MIGRATION_VERSION, type KVStore } from './legacy-migration'

function mem(initial: Record<string, string> = {}): KVStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

describe('runLegacyMigration', () => {
  it('runs once per user then is a no-op (idempotent)', () => {
    const s = mem()
    const first = runLegacyMigration('userA', s)
    expect(first.status).toBe('completed')
    expect(hasMigrated('userA', s)).toBe(true)
    const second = runLegacyMigration('userA', s)
    expect(second.status).toBe('already')
  })

  it('never imports anything into the server model (imported=0)', () => {
    const s = mem({ '75lab_streak': '33', '75lab_daily_2026-06-20': '{"tasks":{"water":true}}' })
    const r = runLegacyMigration('userA', s)
    expect(r.imported).toBe(0)
  })

  it('never converts a legacy aggregate streak into verified completion', () => {
    // The legacy streak must remain untouched and must not become server data.
    const s = mem({ '75lab_streak': '33' })
    runLegacyMigration('userA', s)
    // legacy key preserved, unchanged
    expect(s.getItem('75lab_streak')).toBe('33')
    // no server-completion artifact was written anywhere
    for (const k of s.data.keys()) expect(k).not.toContain('allComplete')
  })

  it('refuses to attribute anonymous legacy data without an authenticated user', () => {
    const s = mem({ '75lab_streak': '33' })
    const r = runLegacyMigration(null, s)
    expect(r.status).toBe('skipped-no-user')
    // no marker written, streak untouched
    expect(s.getItem('75lab_streak')).toBe('33')
  })

  it('is scoped per user — one user\'s marker does not mark another', () => {
    const s = mem()
    runLegacyMigration('userA', s)
    expect(hasMigrated('userA', s)).toBe(true)
    expect(hasMigrated('userB', s)).toBe(false) // B must still run independently
    expect(runLegacyMigration('userB', s).status).toBe('completed')
  })

  it('marker carries the version', () => {
    const s = mem()
    runLegacyMigration('userA', s)
    expect(s.getItem(`migrated_legacy::userA`)).toBe(String(LEGACY_MIGRATION_VERSION))
  })
})
