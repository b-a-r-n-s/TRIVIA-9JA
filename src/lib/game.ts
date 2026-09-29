import { supabase } from './supabase'

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
