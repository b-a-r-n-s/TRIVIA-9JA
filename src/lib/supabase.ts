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

    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      guestSessionPromise = null
      throw error
    }
  })

  return guestSessionPromise
}
