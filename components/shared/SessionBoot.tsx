'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getStorageUser, setStorageUser, clearUserScopedStorage } from '@/lib/storage'

/**
 * Keeps the client storage namespace in lockstep with the authenticated
 * session. Mounted once under SessionProvider. Its job is defense-in-depth on
 * top of logout cleanup: if the browser ever ends up with a session for a
 * DIFFERENT user than the cached data belongs to (e.g. cookie changed without
 * an explicit logout, or a previous logout was interrupted), it purges the
 * stale namespace before any page can render another user's cached data.
 *
 * Identity itself (username/role) is always read from the session, never from
 * this cache — so this only governs non-authoritative activity data.
 */
export function SessionBoot() {
  const { data, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    const uid = data?.user?.id ?? null
    if (!uid) return // unauthenticated: logout already purged; leave scope alone
    const prev = getStorageUser()
    if (prev && prev !== uid) {
      // Cached data belongs to a different account — wipe it before it shows.
      clearUserScopedStorage()
    }
    setStorageUser(uid)
  }, [data?.user?.id, status])

  return null
}
