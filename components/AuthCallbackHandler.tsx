'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Handles Supabase auth redirect callback when tokens are in the URL hash.
 * (e.g. after password reset or magic link: /#access_token=...&refresh_token=...)
 * The hash is only visible client-side; we set the session then refresh so the server sees it.
 */
export default function AuthCallbackHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) return

    const supabase = createClient()
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        // Remove hash from URL so the next server render doesn't see a broken URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        router.refresh()
      })
      .catch((err) => {
        console.error('Auth callback: failed to set session', err)
      })
  }, [router, pathname])

  return null
}
