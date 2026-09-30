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
  const { data, error } = await supabase.rpc('unlock_solo_retry', {
    p_user: session.user.id,
    p_language: language,
    p_level: level,
    p_cost: SOLO_RETRY_COST,
  })
  if (error || !data?.[0]) {
    throw error ?? new Error('Could not unlock the retry.')
  }
  return {
    coins_remaining: Number(data[0].coins_remaining ?? 0),
    retry_credits: Number(data[0].retry_credits ?? 0),
  }
}
