import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

let guestSessionPromise: Promise<Session> | null = null

type LanguageCode = 'en' | 'ha' | 'yo' | 'ig'
type Mode = 'solo' | 'community'

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message
    try {
      const response = (error as any).context as Response | undefined
      if (response) {
        const payload = await response.json()
        message = payload?.error ?? message
      }
    } catch {}
    throw new Error(message)
  }
  if ((data as any)?.error) throw new Error((data as any).error)
  return data as T
}

export type GameQuestion = {
  id: string
  language: LanguageCode
  mode: Mode
  level: number | null
  question_type: string
  prompt: string
  options: unknown
  metadata: Record<string, unknown> | null
}

export type PlayerProgress = {
  user_id: string
  coins: number
  current_level: number
  levels_completed: number
  total_correct: number
  total_answered: number
}

async function createGuestSession(): Promise<Session> {
  const { data: guest, error: guestError } = await supabase.functions.invoke('guest_session', { body: {} })

  if (guestError) {
    let message = guestError.message ?? 'Could not start a guest session.'
    try {
      const response = (guestError as any)?.context as Response | undefined
      if (response) {
        const payload = await response.clone().json()
        message = payload?.error ?? message
      }
    } catch {}
    throw new Error(message)
  }

  if (!guest?.access_token || !guest?.refresh_token) {
    throw new Error(guest?.error ?? 'Could not start a guest session.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: guest.access_token,
    refresh_token: guest.refresh_token,
  })

  if (sessionError || !sessionData.session) {
    throw sessionError ?? new Error('Could not establish the guest session.')
  }

  return sessionData.session
}

export async function ensurePlayerSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  if (!guestSessionPromise) {
    guestSessionPromise = createGuestSession().finally(() => {
      guestSessionPromise = null
    })
  }

  return guestSessionPromise
}

export async function getAuthUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function isGuestUser() {
  const user = await getAuthUser()
  return Boolean(user?.user_metadata?.guest === true)
}

export type PlayerProfile = {
  user_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  age: number | null
  bio: string | null
  theme: 'dark' | 'light' | 'system'
  preferred_language: LanguageCode
}

export async function createAccountFromGuest(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  const { data, error } = await supabase.auth.updateUser({
    email: cleanEmail,
    password,
    data: { guest: true, account_type: 'player' },
  })
  if (error || !data.user) throw error ?? new Error('Could not create your account.')
  return { user_id: data.user.id, email: cleanEmail, verification_required: true }
}

export async function verifyGuestAccount(email: string, token: string, displayName: string, avatarUrl: string | null = null) {
  const cleanName = displayName.trim()
  if (cleanName.length < 2 || cleanName.length > 24) throw new Error('Display name must be 2–24 characters.')

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email_change',
  })
  if (error || !data.session || !data.user) throw error ?? new Error('That verification code is invalid or expired.')

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { guest: false, account_type: 'player' },
  })
  if (metadataError) throw metadataError

  await savePlayerProfile({ display_name: cleanName, username: null, avatar_url: avatarUrl })
  return data.session
}

export async function resendGuestVerification(email: string) {
  const cleanEmail = email.trim().toLowerCase()
  const { error } = await supabase.auth.updateUser({ email: cleanEmail })
  if (error) throw error
}

export async function signInPlayer(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error || !data.session) throw error ?? new Error('Could not sign you in.')
  return data.session
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
  if (error) throw error
}

export async function getPlayerProfile(): Promise<PlayerProfile | null> {
  const session = await ensurePlayerSession()
  const { data, error } = await supabase.from('profiles')
    .select('user_id,display_name,username,avatar_url,age,bio,theme,preferred_language')
    .eq('user_id', session.user.id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { user_id: data.user_id, display_name: data.display_name, username: data.username, avatar_url: data.avatar_url, age: data.age, bio: data.bio, theme: data.theme, preferred_language: data.preferred_language }
}

export async function savePlayerProfile(input: { display_name: string; username?: string | null; avatar_url?: string | null; age?: number | null; bio?: string | null }) {
  const session = await ensurePlayerSession()
  const displayName = input.display_name.trim()
  if (displayName.length < 2 || displayName.length > 24) throw new Error('Display name must be 2–24 characters.')
  const { error } = await supabase.from('profiles').upsert({
    user_id: session.user.id, display_name: displayName, username: input.username ?? null, avatar_url: input.avatar_url ?? null, age: input.age ?? null, bio: input.bio ?? null,
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function uploadPlayerAvatar(file: File) {
  const session = await ensurePlayerSession()
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Avatar must be 2 MB or smaller.')
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = session.user.id + '/' + crypto.randomUUID() + '.' + extension
  const { error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export async function getPlayerProgress(): Promise<PlayerProgress> {
  const session = await ensurePlayerSession()
  const { data, error } = await supabase
    .from('player_progress')
    .select('user_id,coins,current_level,levels_completed,total_correct,total_answered')
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    throw error ?? new Error('Could not load player progress.')
  }

  return {
    user_id: data.user_id,
    coins: Number(data.coins ?? 0),
    current_level: Number(data.current_level ?? 1),
    levels_completed: Number(data.levels_completed ?? 0),
    total_correct: Number(data.total_correct ?? 0),
    total_answered: Number(data.total_answered ?? 0),
  }
}

export async function getNextQuestions(mode: Mode, language: LanguageCode, level: number | null, limit = 10) {
  return invoke<{ pool_key: string; exhausted: boolean; questions: GameQuestion[] }>('get_next_questions', {
    mode, language, level: mode === 'solo' ? level : null, limit,
  })
}

export async function submitAnswer(body: {
  question_id: string
  mode: Mode
  level: number | null
  attempt_id?: string
  answer: string
  idempotency_key: string
}) {
  return invoke<{ correct: boolean; correct_answer?: string; explanation?: string | null; duplicate: boolean; coins_awarded: number }>('submit_answer', body)
}

export async function useHint(body: {
  question_id: string
  mode: Mode
  level: number | null
  attempt_id?: string
  hint_type: 'eliminate' | 'clue'
  idempotency_key: string
}) {
  return invoke<{ hint_type: string; cost: number; coins_remaining: number; eliminated_option?: number | null; clue?: string | null }>('use_hint', body)
}

export async function startCommunityAttempt(language: LanguageCode) {
  return invoke<{
    attempt: { id: string; language: LanguageCode; started_at: string; expires_at: string; score: number; answered_count: number }
    coins: number
    free_attempt: boolean
  }>('start_community_attempt', { language })
}

export async function finishCommunityAttempt(attempt_id: string) {
  return invoke<{
    attempt_id: string
    score: number
    answered_count: number
    rank: number
    total_players: number
  }>('finish_community_attempt', { attempt_id })
}

export async function finishSoloLevel(language: LanguageCode, level: number) {
  return invoke<{ completed: boolean; new_current_level: number; score: number }>('finish_solo_level', { language, level })
}

export const SOLO_RETRY_COST = 25

export async function unlockSoloRetry(language: LanguageCode, level: number) {
  const session = await ensurePlayerSession()
  const { data, error } = await supabase.rpc('unlock_solo_retry_and_get_questions', {
    p_user: session.user.id,
    p_language: language,
    p_level: level,
    p_limit: 10,
    p_cost: SOLO_RETRY_COST,
  })
  if (error || !data?.length) {
    throw error ?? new Error('Could not unlock the retry.')
  }
  return {
    coins_remaining: Number(data[0].coins_remaining ?? 0),
    questions: data,
  }
}
