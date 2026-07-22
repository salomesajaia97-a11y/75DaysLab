'use client'
import { signOut } from 'next-auth/react'
import { clearUserScopedStorage } from '@/lib/storage'

/**
 * Full logout: destroy the server session, wipe ALL user-scoped client cache,
 * then hard-navigate to /login. The full navigation (not router.push) tears
 * down the SessionProvider and RSC/router cache so no stale profile, role, or
 * admin nav can survive into the next account. `replace` keeps the protected
 * page out of history so Back cannot restore it.
 */
export async function performLogout(): Promise<void> {
  // Clear local cache first so nothing lingers even if navigation is slow.
  clearUserScopedStorage()
  // redirect:false — we do the navigation ourselves so cleanup is guaranteed
  // to run and we control history via replace().
  await signOut({ redirect: false })
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
}
