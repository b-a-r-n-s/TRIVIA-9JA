import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { ensurePlayerSession, getPlayerProgress, getNextQuestions, submitAnswer, useHint, finishSoloLevel, startCommunityAttempt, finishCommunityAttempt, unlockSoloRetry, SOLO_RETRY_COST } from './lib/game'

type Language = 'English' | 'Hausa' | 'Yorùbá' | 'Igbo'
type Modal = 'menu' | 'profile' | 'edit-profile' | 'leaderboard' | 'topup' | null
type GameMode = 'solo' | 'community'
type PresentationState = { mode: GameMode; level?: number }

const languages: Language[] = ['English', 'Hausa', 'Yorùbá', 'Igbo']

const avatars = [
  ['eagle', '🦅', 'Naija Eagle'], ['lion', '🦁', 'African Lion'], ['crown', '👑', 'Oba Crown'], ['fire', '🔥', 'Trivia Flame'],
  ['star', '⭐', 'Golden Star'], ['drum', '🪘', 'Talking Drum'], ['mask', '🎭', 'Cultural Mask'], ['gem', '💎', 'Naija Gem'],
]

const rankings = [
  ['Chidi_Lagos', '👑', 'Lagos', '18,450 pts'], ['Amina_Abuja', '🦅', 'FCT Abuja', '16,920 pts'],
  ['Tunde_Vibes', '⚡', 'Oyo', '14,100 pts'], ['Emeka_PH', '🔥', 'Rivers', '12,850 pts'], ['Zainab_Kano', '✨', 'Kano', '11,200 pts'],
]

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z" />,
    brain: <><path d="M9 4.5A3.5 3.5 0 0 0 5.5 8c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 16a3.5 3.5 0 0 0 6 2.5V5a3.5 3.5 0 0 0-4-.5Z" /><path d="M15 4.5A3.5 3.5 0 0 1 18.5 8c0 .5-.1 1.4-.3 1.4A3.5 3.5 0 0 1 17 16a3.5 3.5 0 0 1-6 2.5V5a3.5 3.5 0 0 1 4-.5Z" /></>,
    trophy: <><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 6H3v2a5 5 0 0 0 5 5M17 6h4v2a5 5 0 0 1-5 5M12 15v5M8 20h8" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="M7 15v-4M11 15V7M15 15v-7M19 15V4" /></>,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    volume: <><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    edit: <><path d="m4 16-.8 4.8L8 20l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17Z" /><path d="m13.5 7.5 3 3" /></>,
  }
  return <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Overlay({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="dialog">
      <button className="dialog-close" onClick={onClose}><Icon name="x" /></button>
      <div className="dialog-heading"><span>TRIVIA 9JA</span><h2>{title}</h2></div>{children}
    </section>
  </div>
}

type SoloQuestion = {
  id: string
  category: string
  question: string
  options: string[]
}

const languageCodes: Record<Language, 'en' | 'ha' | 'yo' | 'ig'> = {
  English: 'en',
  Hausa: 'ha',
  'Yorùbá': 'yo',
  Igbo: 'ig',
}

function SoloLevelSelectScreen({
  isDark,
  onClose,
  onStart,
  onCoinsChange,
}: {
  isDark: boolean
  onClose: () => void
  onStart: (level: number) => void
  onCoinsChange: (coins: number) => void
}) {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [coins, setCoins] = useState(500)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryBusy, setRetryBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const progress = await getPlayerProgress()
        if (cancelled) return
        setCurrentLevel(progress.current_level)
        setLevelsCompleted(progress.levels_completed)
        setCoins(progress.coins)
        onCoinsChange(progress.coins)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your Solo progress.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [onCoinsChange])

  if (loading) return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}><div className="game-modal result-modal"><div className="result-kicker">SOLO MODE</div><div className="result-mark">…</div><h1>Loading your levels.</h1><p className="result-copy">Checking your progress.</p></div></div>

  if (error) return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}><div className="game-modal result-modal"><div className="result-kicker">COULD NOT LOAD</div><div className="result-mark">!</div><h1>Levels unavailable.</h1><p className="result-copy">{error}</p><div className="result-actions"><button className="result-primary" onClick={onClose}>BACK TO ARENA</button></div></div></div>

  return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}>
    <div className="game-modal level-select-modal">
      <div className="game-head"><button className="icon-button" aria-label="Back to arena" onClick={onClose}><Icon name="x" /></button><div className="game-title">TRIVIA <em>9JA</em></div><div className="level-coins"><i className="coin-emoji" aria-label="coin" /> {coins}</div></div>
      <div className="level-select-heading">
        <div className="result-kicker">SOLO MODE</div>
        <h1>Choose your level.</h1>
        <p>Complete each level to unlock the next one. One level is a 10-question, 2-minute run.</p>
      </div>
      <div className="level-grid">
        {Array.from({ length: 10 }, (_, index) => index + 1).map(level => {
          const completed = level <= levelsCompleted
          const unlocked = level === currentLevel
          const status = completed ? 'completed' : unlocked ? 'current' : 'locked'
          return <button
            key={level}
            className={'level-card ' + status}
            disabled={!unlocked}
            onClick={() => { onCoinsChange(coins); onStart(level) }}
          >
            <span className="level-number">{level}</span>
            <span className="level-copy"><b>LEVEL {level}</b><small>{completed ? 'COMPLETED' : unlocked ? 'PLAY NOW' : 'LOCKED'}</small></span>
            <span className="level-status">{completed ? '✓' : unlocked ? '→' : '•••'}</span>
          </button>
        })}
      </div>
    </div>
  </div>
}

function PresentationScreen({
  mode,
  level,
  language,
  isDark,
  onClose,
  initialCoins,
  onCoinsChange,
}: {
  mode: GameMode
  level: number | null
  language: Language
  isDark: boolean
  onClose: () => void
  initialCoins: number
  onCoinsChange: (coins: number) => void
}) {
  const isCommunity = mode === 'community'
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<SoloQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: string | null } | null>(null)
  const [eliminated, setEliminated] = useState<number[]>([])
  const [hintUsed, setHintUsed] = useState(false)
  const [clue, setClue] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(initialCoins)
  const [secondsLeft, setSecondsLeft] = useState(isCommunity ? 180 : 120)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCoins = (value: number | ((current: number) => number)) => {
    setCoins(current => {
      const next = typeof value === 'function' ? value(current) : value
      onCoinsChange(next)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const session = await ensurePlayerSession()
        const attemptPromise = isCommunity ? startCommunityAttempt(languageCodes[language]) : Promise.resolve(null)
        const questionsPromise = getNextQuestions(mode, languageCodes[language], level, 10)
        const progressPromise = isCommunity ? getPlayerProgress() : Promise.resolve(null)
        const [attempt, result, progress] = await Promise.all([attemptPromise, questionsPromise, progressPromise])

        if (cancelled) return
        if (attempt) {
          setAttemptId(attempt.attempt.id)
          updateCoins(attempt.coins)
        } else {
          updateCoins(progress?.coins ?? initialCoins)
        }

        setQuestions(result.questions.map((q: any) => ({
          id: q.id,
          category: String(q.metadata?.category ?? q.question_type ?? 'TRIVIA').toUpperCase(),
          question: q.prompt,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
        })))

        if (!session.user) throw new Error('Could not establish a player session.')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start the game.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [language, mode, level])

  useEffect(() => {
    if (finished || loading || !!error) return
    const timer = window.setInterval(() => {
      setSecondsLeft(seconds => {
        if (seconds <= 1) {
          window.clearInterval(timer)
          setFinished(true)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [finished, loading, error])

  const question = questions[questionIndex]
  const answered = selectedAnswer !== null

  const chooseAnswer = async (index: number) => {
    if (!question || answered || eliminated.includes(index) || busy) return
    const answer = question.options[index]
    setSelectedAnswer(answer)
    setAnswerResult(null)
    setError(null)
    setBusy(true)
    try {
      const result = await submitAnswer({
        question_id: question.id,
        mode,
        level,
        ...(isCommunity && attemptId ? { attempt_id: attemptId } : {}),
        answer,
        idempotency_key: crypto.randomUUID(),
      })
      setAnswerResult({
        correct: result.correct,
        correctAnswer: result.correct_answer ?? null,
      })
      if (result.correct) setScore(value => value + 1)
      if (result.coins_awarded) updateCoins(value => value + result.coins_awarded)

      await new Promise(resolve => window.setTimeout(resolve, 450))
      if (!isCommunity && questionIndex === questions.length - 1) {
        await finishSoloLevel(languageCodes[language], level as number)
        setFinished(true)
      } else if (isCommunity && questionIndex === questions.length - 1) {
        if (!attemptId) throw new Error('Community attempt is missing.')
        await finishCommunityAttempt(attemptId)
        setFinished(true)
      } else {
        setQuestionIndex(value => value + 1)
        setSelectedAnswer(null)
        setAnswerResult(null)
        setEliminated([])
        setHintUsed(false)
        setClue(null)
      }
    } catch (e) {
      setSelectedAnswer(null)
      setAnswerResult(null)
      setError(e instanceof Error ? e.message : 'Answer could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  const unlockRetry = async () => {
    if (isCommunity || !level || retryBusy) return
    setRetryBusy(true)
    setError(null)
    try {
      const purchase = await unlockSoloRetry(languageCodes[language], level)
      updateCoins(purchase.coins_remaining)
      setLoading(true)
      const result = await getNextQuestions('solo', languageCodes[language], level, 10)
      setQuestions(result.questions.map((q: any) => ({
        id: q.id,
        category: String(q.metadata?.category ?? q.question_type ?? 'TRIVIA').toUpperCase(),
        question: q.prompt,
        options: Array.isArray(q.options) ? q.options.map(String) : [],
      })))
      setQuestionIndex(0)
      setSelectedAnswer(null)
      setAnswerResult(null)
      setEliminated([])
      setHintUsed(false)
      setClue(null)
      setScore(0)
      setSecondsLeft(120)
      setFinished(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock the retry.')
    } finally {
      setLoading(false)
      setRetryBusy(false)
    }
  }

  const useEliminate = async () => {
    if (!question || answered || eliminated.length >= 2 || busy) return
    setBusy(true)
    try {
      const result = await useHint({
        question_id: question.id, mode, level,
        ...(isCommunity && attemptId ? { attempt_id: attemptId } : {}),
        hint_type: 'eliminate', idempotency_key: crypto.randomUUID(),
      })
      if (result.eliminated_option !== null && result.eliminated_option !== undefined) {
        setEliminated(value => [...value, Number(result.eliminated_option)])
      }
      updateCoins(result.coins_remaining)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hint could not be used.')
    } finally {
      setBusy(false)
    }
  }

  const useClue = async () => {
    if (!question || answered || hintUsed || busy) return
    setBusy(true)
    try {
      const result = await useHint({
        question_id: question.id, mode, level,
        ...(isCommunity && attemptId ? { attempt_id: attemptId } : {}),
        hint_type: 'clue', idempotency_key: crypto.randomUUID(),
      })
      setHintUsed(true)
      setClue(result.clue ?? null)
      updateCoins(result.coins_remaining)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hint could not be used.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}><div className="game-modal result-modal"><div className="result-kicker">{isCommunity ? 'COMMUNITY CHALLENGE' : 'SOLO MODE'}</div><div className="result-mark">…</div><h1>Preparing your questions.</h1><p className="result-copy">Connecting to the Trivia 9ja question pool.</p></div></div>

  if (error && questions.length === 0) {
    const poolExhausted = !isCommunity && error.includes('Not enough new questions remaining')
    if (poolExhausted) {
      return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}>
        <div className="game-modal retry-modal">
          <div className="result-kicker">SOLO MODE · LEVEL {level}</div>
          <div className="retry-glyph">↻</div>
          <h1>Your trial rounds are used.</h1>
          <p className="result-copy">You have seen all the questions currently available for this level. Unlock another run with coins.</p>
          <div className="retry-cost"><i className="coin-emoji" aria-label="coin" /><b>{SOLO_RETRY_COST}</b><span>COINS FOR 1 RETRY</span></div>
          <div className="retry-balance"><span>YOUR BALANCE</span><strong><i className="coin-emoji" aria-label="coin" /> {coins}</strong></div>
          <div className="result-actions">
            <button className="result-primary" onClick={unlockRetry} disabled={retryBusy || coins < SOLO_RETRY_COST}>{retryBusy ? 'UNLOCKING…' : coins < SOLO_RETRY_COST ? 'NOT ENOUGH COINS' : 'UNLOCK RETRY'}</button>
            <button className="result-secondary" onClick={onClose}>BACK TO LEVELS</button>
          </div>
        </div>
      </div>
    }
    return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}><div className="game-modal result-modal"><div className="result-kicker">COULD NOT START</div><div className="result-mark">!</div><h1>Game unavailable.</h1><p className="result-copy">{error}</p><div className="result-actions"><button className="result-primary" onClick={onClose}>BACK TO LEVELS</button></div></div></div>
  }

  if (!question) return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}><div className="game-modal result-modal"><div className="result-kicker">NO QUESTIONS AVAILABLE</div><div className="result-mark">?</div><h1>Round unavailable.</h1><p className="result-copy">There are no active questions available for this level right now.</p><div className="result-actions"><button className="result-primary" onClick={onClose}>BACK TO LEVELS</button></div></div></div>

  if (finished) {
    const percentage = Math.round((score / Math.max(questions.length, 1)) * 100)
    return <div className={'game-overlay ' + (isDark ? 'dark' : 'light')}>
      <div className="game-modal result-modal">
        <div className="result-kicker">ROUND COMPLETE</div>
        <div className="result-mark">✓</div>
        <p className="result-overline">{mode.toUpperCase()} · {language.toUpperCase()}</p>
        <h1>{score === questions.length ? 'Perfect round.' : score >= 7 ? 'Strong run.' : score >= 4 ? 'Keep pushing.' : 'Round over.'}</h1>
        <p className="result-copy">You got <strong>{score}/{questions.length}</strong> correct and finished with <strong>{percentage}%</strong>.</p>
        <div className="result-stats"><div><b>{score}</b><span>CORRECT</span></div><div><b>+{score}</b><span><i className="coin-emoji" aria-label="coin" /> EARNED</span></div><div><b>{coins}</b><span><i className="coin-emoji" aria-label="coin" /> BALANCE</span></div></div>
        <div className="result-actions"><button className="result-primary" onClick={onClose}>BACK TO {isCommunity ? 'ARENA' : 'LEVELS'}</button></div>
      </div>
    </div>
  }

  const formattedTime = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
  const progress = ((questionIndex + 1) / Math.max(questions.length, 1)) * 100

  return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}>
    <div className="game-modal">
      <div className="game-head"><button className="icon-button" aria-label="Exit game" onClick={onClose}><Icon name="x" /></button><div className="game-title">TRIVIA <em>9JA</em></div><div className={`game-timer ${secondsLeft <= 20 ? 'urgent' : ''}`}>◷ {formattedTime}</div></div>
      <div className="game-progress"><span style={{ width: progress + '%' }} /></div>
      <div className="solo-meta"><span>{isCommunity ? 'COMMUNITY CHALLENGE' : `SOLO MODE · LEVEL ${level}`}</span><b>QUESTION {questionIndex + 1}<i>/{questions.length}</i></b><strong><i className="coin-emoji" aria-label="coin" /> {coins}</strong></div>
      <div key={questionIndex} className="question-stage">
        <div className="solo-question"><div className="question-meta"><span>{question.category}</span>{hintUsed && <b>CLUE ACTIVE</b>}</div><h1>{question.question}</h1>{clue && <p className="clue-text">Clue: {clue}</p>}</div>
        <div className="answer-options">{question.options.map((answer, index) => {
          const state = answerResult
            ? (answerResult.correctAnswer
              ? (answer === answerResult.correctAnswer ? 'correct' : (selectedAnswer === answer ? 'wrong' : ''))
              : (selectedAnswer === answer ? (answerResult.correct ? 'correct' : 'wrong') : ''))
            : (selectedAnswer === answer ? 'selected' : '')
          return <button key={answer} className={state + (eliminated.includes(index) ? ' eliminated' : '')} onClick={() => chooseAnswer(index)} disabled={answered || eliminated.includes(index) || busy}><span>{String.fromCharCode(65 + index)}</span><em>{answer}</em></button>
        })}</div>
        {error && <div className="answer-feedback negative"><div><b>ERROR</b><span>{error}</span></div></div>}
        <div className="solo-footer"><div className="hint-row"><button className={answered || busy ? 'disabled' : ''} onClick={useEliminate}><b>−</b><span>ELIMINATE</span><small><i className="coin-emoji" aria-label="coin" /> 1</small></button><button className={hintUsed || answered || busy ? 'disabled' : ''} onClick={useClue}><b>?</b><span>CLUE</span><small><i className="coin-emoji" aria-label="coin" /> 2</small></button></div></div>
      </div>
    </div>
  </div>
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('trivia9ja.language') as Language) || 'English')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('trivia9ja.theme') as 'dark' | 'light') || 'dark')
  const [modal, setModal] = useState<Modal>(null)
  const [presentation, setPresentation] = useState<PresentationState | null>(null)
  const [coins, setCoins] = useState(500)
  const [sound, setSound] = useState(true)
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('trivia9ja.avatar') || 'eagle')
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('trivia9ja.displayName') || 'NaijaGenius_01')
  const [tagline, setTagline] = useState(() => localStorage.getItem('trivia9ja.tagline') || 'Trivia King & Lagos Genius 👑')
  const isDark = theme === 'dark'
  const selectedAvatarEmoji = avatars.find(a => a[0] === selectedAvatar)?.[1] || '🦅'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      try {
        const progress = await getPlayerProgress()
        if (!cancelled) setCoins(progress.coins)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    localStorage.setItem('trivia9ja.language', language)
    localStorage.setItem('trivia9ja.theme', theme)
    localStorage.setItem('trivia9ja.avatar', selectedAvatar)
    localStorage.setItem('trivia9ja.displayName', displayName)
    localStorage.setItem('trivia9ja.tagline', tagline)
  }, [language, theme, selectedAvatar, displayName, tagline])

  useEffect(() => {
    window.history.replaceState(
      { trivia9ja: true, modal: null, presentation: null },
      '',
      window.location.href
    )

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state
      if (state?.trivia9ja) {
        setModal(state.modal ?? null)
        setPresentation(state.presentation ?? null)
      } else {
        setModal(null)
        setPresentation(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextModal: Modal = null, nextPresentation: PresentationState | null = null) => {
    window.history.pushState(
      { trivia9ja: true, modal: nextModal, presentation: nextPresentation },
      '',
      window.location.href
    )
    setModal(nextModal)
    setPresentation(nextPresentation)
  }

  const goBack = () => {
    if (window.history.state?.trivia9ja) {
      window.history.back()
    } else {
      setModal(null)
      setPresentation(null)
    }
  }

  if (presentation?.mode === 'solo' && !presentation.level) {
    return <SoloLevelSelectScreen isDark={isDark} onClose={goBack} onStart={level => navigate(null, { mode: 'solo', level })} onCoinsChange={setCoins} />
  }

  if (presentation) {
    return <PresentationScreen mode={presentation.mode} level={presentation.level ?? null} language={language} isDark={isDark} onClose={goBack} initialCoins={coins} onCoinsChange={setCoins} />
  }

  return <main className={'app ' + (isDark ? 'dark' : 'light')}>
    <div className="ambient ambient-green" /><div className="ambient ambient-amber" />
    <div className="workspace">
      <section className="left-panel">
        <header className="topbar">
          <button className="icon-button" onClick={() => navigate('menu')}><Icon name="menu" /></button>
          <div className="coin-display"><i className="coin-emoji" aria-label="coin" /><b>{coins}</b></div>
          <button className="topup btn-shine" onClick={() => navigate('topup')}><Icon name="zap" /> TOP UP</button>
          <button className="icon-button amber" onClick={() => setTheme(isDark ? 'light' : 'dark')}><Icon name={isDark ? 'sun' : 'moon'} /></button>
          <button className="avatar-button" onClick={() => navigate('profile')}>{selectedAvatarEmoji}</button>
        </header>
        <div className="brand-area">
          <div className="eyebrow-pill"><span>✦</span> OFFICIAL NIGERIAN TRIVIA</div>
          <h1 className="brand">TRIVIA <em>9JA</em></h1>
        </div>
        <div className="language-area">
          <div className="language-label"><span><Icon name="globe" /> SELECT QUIZ LANGUAGE</span></div>
          <div className="language-grid">{languages.map(lang => <button key={lang} className={'language ' + (lang === language ? 'active' : '')} onClick={() => setLanguage(lang)}>{lang}</button>)}</div>
        </div>
      </section>

      <section className="right-panel">
        <button className="card-glow-emerald mode-card" onClick={() => navigate(null, { mode: 'solo' })}>
          <div className="card-inner-surface" /><div className="card-top"><span>01 SOLO MODE</span><b>◷ 2 MIN TIMER</b></div>
          <div className="mode-body"><div className="mode-icon"><Icon name="brain" /></div><div className="mode-copy"><h2>10 Questions. Auto-Advance.</h2><div className="tags"><span className="gold">₦ EARN COINS</span></div></div></div>
          <span className="action-button green btn-shine">PLAY 2-MIN SOLO <Icon name="arrow" /></span>
        </button>
        <button className="card-glow-amber mode-card" onClick={() => navigate(null, { mode: 'community' })}>
          <div className="card-inner-surface" /><div className="card-top"><span>02 COMMUNITY RANKED</span><b className="gold-badge">🔥 FREE TODAY</b></div>
          <div className="mode-body"><div className="mode-icon gold-icon"><Icon name="trophy" /></div><div className="mode-copy"><h2>Take on the nation.</h2><p>Compete against state champions online!</p></div></div>
          <span className="action-button amber-action btn-shine">PLAY COMMUNITY CHALLENGE <Icon name="arrow" /></span>
        </button>
        <button className="leaderboard-strip" onClick={() => navigate('leaderboard')}><span className="leader-icon"><Icon name="chart" /></span><span><b>LEADERBOARD</b><small>• Rank #NaijaGenius_01</small></span><Icon name="arrow" /></button>
      </section>
    </div>

    {modal === 'menu' && <Overlay title="Menu & Settings" onClose={goBack}>
      <button className="dialog-action" onClick={() => navigate('edit-profile')}><span><Icon name="edit" /> Edit Profile (DP & Name)</span><Icon name="arrow" /></button>
      <button className="dialog-action" onClick={() => setTheme(isDark ? 'light' : 'dark')}><span><Icon name={isDark ? 'sun' : 'moon'} /> Theme Mode</span><b>{theme.toUpperCase()}</b></button>
      <button className="dialog-action" onClick={() => setSound(v => !v)}><span><Icon name="volume" /> Sound FX</span><b className={sound ? 'good' : 'bad'}>{sound ? 'ON' : 'OFF'}</b></button>
      <button className="dialog-action" onClick={() => navigate('leaderboard')}><span><Icon name="trophy" /> National Leaderboard</span><Icon name="arrow" /></button>
      <button className="dialog-action" onClick={() => navigate('topup')}><span><Icon name="zap" /> Top Up Coins</span><Icon name="arrow" /></button>
    </Overlay>}

    {modal === 'profile' && <Overlay title="Your Profile" onClose={goBack}>
      <div className="profile-header"><div className="profile-avatar">{selectedAvatarEmoji}</div><div><b>{displayName}</b><span>{tagline}</span><small>Nigeria 🇳🇬</small></div></div>
      <button className="dialog-action" onClick={() => navigate('edit-profile')}><span><Icon name="edit" /> EDIT PROFILE</span><Icon name="arrow" /></button>
    </Overlay>}

    {modal === 'edit-profile' && <Overlay title="Edit Your Profile" onClose={goBack}>
      <label className="field-label">SELECT DISPLAY AVATAR (DP)</label>
      <div className="avatar-grid">{avatars.map(([id, emoji, name]) => <button key={id} className={'avatar-choice ' + (selectedAvatar === id ? 'active' : '')} onClick={() => setSelectedAvatar(id)}><span>{emoji}</span><small>{name}</small></button>)}</div>
      <label className="field-label">DISPLAY NAME</label><input className="profile-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <label className="field-label">BIO / TAGLINE</label><input className="profile-input" value={tagline} onChange={e => setTagline(e.target.value)} />
      <button className="save-profile btn-shine" onClick={() => navigate('profile')}><span>✓</span> SAVE PROFILE EDITS</button>
    </Overlay>}

    {modal === 'leaderboard' && <Overlay title="Naija National Rankings" onClose={goBack}>
      <div className="rank-list">{rankings.map(([name, avatar, state, score], i) => <div className="rank-row" key={name}><b>#{i + 1}</b><span>{avatar}</span><div><strong>{name}</strong><small>{state}</small></div><em>{score}</em></div>)}</div>
    </Overlay>}

    {modal === 'topup' && <Overlay title="Top Up Coins" onClose={goBack}>
      <div className="topup-list">{[[200,'₦500'],[500,'₦1,200'],[1200,'₦2,500']].map(([coins, price]) => <button className="topup-pack" key={coins}><b>{coins} COINS</b><span>BUY {price}</span></button>)}</div>
    </Overlay>}
  </main>
}

export default App
