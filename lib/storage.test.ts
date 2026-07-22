import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Minimal in-memory Storage that satisfies the subset lib/storage.ts uses
// (getItem/setItem/removeItem/key/length). Lets us exercise the browser paths
// in the default `node` vitest environment without jsdom.
class MemoryStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v))
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null
  }
  clear() {
    this.map.clear()
  }
}

let store: MemoryStorage

beforeEach(() => {
  store = new MemoryStorage()
  vi.stubGlobal('window', {} as unknown as Window)
  vi.stubGlobal('localStorage', store as unknown as Storage)
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Import fresh each test so the module-level uid cache resets with resetModules.
async function freshModule() {
  return import('./storage')
}

describe('user-scoped storage keys', () => {
  it('namespaces keys by the active user id', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    expect(s.scopedKey('75lab_profile')).toBe('75lab_profile::userA')
    s.setStorageUser('userB')
    expect(s.scopedKey('75lab_profile')).toBe('75lab_profile::userB')
  })

  it('falls back to a guest namespace when no user is set', async () => {
    const s = await freshModule()
    expect(s.scopedKey('75lab_profile')).toBe('75lab_profile::guest')
  })

  it('does not leak profile between two different users', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    // @ts-expect-error minimal profile shape is fine for the storage round-trip
    s.saveProfile({ username: 'alice' })
    expect(s.getProfile()?.username).toBe('alice')

    s.setStorageUser('userB')
    // User B must NOT see user A's cached profile.
    expect(s.getProfile()).toBeNull()
    // @ts-expect-error minimal profile shape
    s.saveProfile({ username: 'bob' })
    expect(s.getProfile()?.username).toBe('bob')

    // Switching back to A still yields A's data (physically partitioned).
    s.setStorageUser('userA')
    expect(s.getProfile()?.username).toBe('alice')
  })

  it('keeps arbitrary namespaced cache isolated per user', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    store.setItem(s.scopedKey('75lab_water_2026-07-22'), '2500')
    s.setStorageUser('userB')
    expect(store.getItem(s.scopedKey('75lab_water_2026-07-22'))).toBeNull()
    s.setStorageUser('userA')
    expect(store.getItem(s.scopedKey('75lab_water_2026-07-22'))).toBe('2500')
  })
})

describe('isUserScopedKey', () => {
  it('flags NAMESPACED 75lab_ and cycle_ keys', async () => {
    const s = await freshModule()
    expect(s.isUserScopedKey('75lab_profile::userA')).toBe(true)
    expect(s.isUserScopedKey('cycle_logged_period::userA')).toBe(true)
  })
  it('does NOT flag legacy un-namespaced keys (preserved for migration)', async () => {
    const s = await freshModule()
    expect(s.isUserScopedKey('75lab_streak')).toBe(false)
    expect(s.isUserScopedKey('75lab_daily_2026-07-22')).toBe(false)
    expect(s.isUserScopedKey('cycle_logged_period')).toBe(false)
  })
  it('does not flag the uid marker or preference keys', async () => {
    const s = await freshModule()
    expect(s.isUserScopedKey('75lab_uid')).toBe(false)
    expect(s.isUserScopedKey('theme')).toBe(false)
    expect(s.isUserScopedKey('locale')).toBe(false)
  })
})

describe('clearUserScopedStorage', () => {
  it('removes namespaced per-user data + uid, but preserves prefs AND legacy keys', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    s.saveProfile({ username: 'alice' } as never) // -> 75lab_profile::userA
    store.setItem(s.scopedKey('75lab_streak'), '5') // -> 75lab_streak::userA (namespaced cache)
    // legacy pre-Phase-1 (un-namespaced) data — MUST survive so it can be migrated
    store.setItem('75lab_streak', '33')
    store.setItem('75lab_daily_2026-06-20', '{}')
    store.setItem('cycle_logged_period', '{}')
    store.setItem('theme', 'dark') // preference — must survive
    store.setItem('locale', 'ge') // preference — must survive

    s.clearUserScopedStorage()

    // namespaced cache gone
    expect(store.getItem('75lab_profile::userA')).toBeNull()
    expect(store.getItem('75lab_streak::userA')).toBeNull()
    expect(store.getItem('75lab_uid')).toBeNull()
    // legacy data preserved (not destroyed by cache cleanup)
    expect(store.getItem('75lab_streak')).toBe('33')
    expect(store.getItem('75lab_daily_2026-06-20')).toBe('{}')
    expect(store.getItem('cycle_logged_period')).toBe('{}')
    // preferences preserved
    expect(store.getItem('theme')).toBe('dark')
    expect(store.getItem('locale')).toBe('ge')
    // after clear, scope is guest again
    expect(s.getStorageUser()).toBeNull()
  })

  it('simulates the reported A→logout→B→logout→A flow with no leak', async () => {
    const s = await freshModule()

    // User A logs in, caches profile
    s.setStorageUser('A')
    s.saveProfile({ username: 'alice' } as never)

    // A logs out — cleanup wipes everything
    s.clearUserScopedStorage()

    // User B logs in — sees nothing from A
    s.setStorageUser('B')
    expect(s.getProfile()).toBeNull()
    s.saveProfile({ username: 'bob' } as never)

    // B logs out
    s.clearUserScopedStorage()

    // A logs back in — must NOT see B's data
    s.setStorageUser('A')
    expect(s.getProfile()).toBeNull()
  })
})
