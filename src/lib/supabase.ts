import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// TRIVIA 9JA is playable before account creation. Anonymous users still receive
// authenticated Supabase sessions, so the existing server-authoritative game
// APIs remain protected by the same JWT/RLS boundary.
let guestSessionPromise: Promise<void> | null = null

export function ensureGuestSession(): Promise<void> {
  if (guestSessionPromise) return guestSessionPromise

  guestSessionPromise = supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) return

    const { error } = await supabase.auth.signInAnonymously({
      options: {
        data: { display_name: 'Naija Player' },
      },
    })

    if (error) {
      guestSessionPromise = null
      throw error
    }
  })

  return guestSessionPromise
}

export async function isAnonymousPlayer(): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  return Boolean(data.user?.is_anonymous)
}

/**
 * Links an email identity to the current anonymous player without creating a
 * second auth user. The user id therefore stays unchanged and all existing
 * TRIVIA 9JA progress remains attached to the same player.
 *
 * Supabase may require the email verification step before a password can be
 * added to an anonymous account. We intentionally keep that conversion
 * separate from first-play access.
 */
export async function linkGuestEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) throw new Error('Enter an email address.')

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user?.is_anonymous) {
    throw new Error('This player already has a permanent account.')
  }

  const { data, error } = await supabase.auth.updateUser({ email: cleanEmail })
  if (error) throw error
  return data.user
}
