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

  it('keeps streak state isolated per user', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    s.saveStreak(12, '2026-07-22')
    s.setStorageUser('userB')
    expect(s.getStreak()).toBe(0)
    s.setStorageUser('userA')
    expect(s.getStreak()).toBe(12)
  })
})

describe('isUserScopedKey', () => {
  it('flags 75lab_ and cycle_ keys', async () => {
    const s = await freshModule()
    expect(s.isUserScopedKey('75lab_profile::userA')).toBe(true)
    expect(s.isUserScopedKey('cycle_logged_period')).toBe(true)
  })
  it('does not flag the uid marker or preference keys', async () => {
    const s = await freshModule()
    expect(s.isUserScopedKey('75lab_uid')).toBe(false)
    expect(s.isUserScopedKey('theme')).toBe(false)
    expect(s.isUserScopedKey('locale')).toBe(false)
  })
})

describe('clearUserScopedStorage', () => {
  it('removes all user-scoped data and the uid, but preserves preferences', async () => {
    const s = await freshModule()
    s.setStorageUser('userA')
    s.saveProfile({ username: 'alice' } as never)
    s.saveStreak(5, '2026-07-22')
    store.setItem('cycle_logged_period', '{}')
    store.setItem('theme', 'dark') // preference — must survive
    store.setItem('locale', 'ge') // preference — must survive

    s.clearUserScopedStorage()

    expect(store.getItem('theme')).toBe('dark')
    expect(store.getItem('locale')).toBe('ge')
    expect(store.getItem('75lab_uid')).toBeNull()
    // every 75lab_/cycle_ payload gone
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)!
      expect(k.startsWith('75lab_')).toBe(false)
      expect(k.startsWith('cycle_')).toBe(false)
    }
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
