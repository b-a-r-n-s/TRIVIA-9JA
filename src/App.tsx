import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { ensurePlayerSession, getPlayerProgress, getNextQuestions, submitAnswer, useHint, finishSoloLevel, startCommunityAttempt, finishCommunityAttempt, unlockSoloRetry, SOLO_RETRY_COST, isGuestUser, createAccountFromGuest, verifyGuestAccount, resendGuestVerification, signInPlayer, requestPasswordReset, getPlayerProfile, savePlayerProfile, uploadPlayerAvatar } from './lib/game'

type Language = 'English' | 'Hausa' | 'Yorùbá' | 'Igbo'
type Modal = 'menu' | 'profile' | 'edit-profile' | 'avatar-picker' | 'leaderboard' | 'topup' | 'friend-mode' | 'auth' | null
type GameMode = 'solo' | 'community'
type PresentationState = { mode: GameMode; language?: Language; level?: number }

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
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
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
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
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

function LanguageSelectScreen({
  isDark,
  mode,
  onClose,
  onStart,
}: {
  isDark: boolean
  mode: GameMode
  onClose: () => void
  onStart: (language: Language) => void
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)

  return <div className={'game-overlay solo-arena ' + (isDark ? 'dark' : 'light')}>
    <div className="game-modal language-select-modal">
      <div className="game-head">
        <button className="icon-button" aria-label="Back to arena" onClick={onClose}><Icon name="x" /></button>
        <div className="game-title">TRIVIA <em>9JA</em></div>
        <div className="language-step">1 / 1</div>
      </div>

      <div className="language-select-heading">
        <div className="result-kicker">{mode === 'solo' ? 'SOLO MODE' : 'COMMUNITY CHALLENGE'}</div>
        <h1>Choose your language.</h1>
        <p>Your questions will stay in this language for the entire game.</p>
      </div>

      <div className="play-language-grid">
        {languages.map(lang => (
          <button
            key={lang}
            className={'play-language-card ' + (selectedLanguage === lang ? 'selected' : '')}
            onClick={() => setSelectedLanguage(lang)}
            aria-pressed={selectedLanguage === lang}
          >
            <span className="play-language-mark">{languageCodes[lang].toUpperCase()}</span>
            <span><b>{lang}</b><small>Play in {lang}</small></span>
            <i>{selectedLanguage === lang ? '✓' : '→'}</i>
          </button>
        ))}
      </div>

      <div className="language-select-actions">
        <button className="result-primary" disabled={!selectedLanguage} onClick={() => selectedLanguage && onStart(selectedLanguage)}>
          CONTINUE TO {mode === 'solo' ? 'LEVELS' : 'GAME'}
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  </div>
}

function AuthScreen({
  isDark,
  intent,
  onClose,
  onSuccess,
}: {
  isDark: boolean
  intent: 'save' | 'competitive'
  onClose: () => void
  onSuccess: () => void
}) {
  const [tab, setTab] = useState<'create' | 'signin'>(intent === 'save' ? 'create' : 'signin')
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [avatarChoice, setAvatarChoice] = useState('eagle')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setStep('details')
    setCode('')
    setError(null)
    setAvatarUrl(null)
    setAvatarFile(null)
  }

  const submit = async () => {
    if (busy) return
    if (tab === 'create') {
      if (!email.trim() || password.length < 6 || displayName.trim().length < 2) return
      setBusy(true); setError(null)
      try {
        let selectedAvatar = avatarUrl
        if (avatarFile) selectedAvatar = await uploadPlayerAvatar(avatarFile)
        else selectedAvatar = 'emoji:' + avatarChoice
        await createAccountFromGuest(email, password)
        setAvatarUrl(selectedAvatar)
        setStep('verify')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create your account.')
      } finally { setBusy(false) }
      return
    }

    if (!email.trim() || !password) return
    setBusy(true); setError(null)
    try {
      await signInPlayer(email, password)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign you in.')
    } finally { setBusy(false) }
  }

  const verify = async () => {
    if (busy || code.trim().length < 6) return
    setBusy(true); setError(null)
    try {
      await verifyGuestAccount(email, code, displayName, avatarUrl)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That verification code is invalid or expired.')
    } finally { setBusy(false) }
  }

  const resend = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await resendGuestVerification(email)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code.')
    } finally { setBusy(false) }
  }

  const sendReset = async () => {
    if (!email.trim() || busy) return
    setBusy(true); setError(null); setResetSent(false)
    try {
      await requestPasswordReset(email)
      setResetSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a reset code.')
    } finally { setBusy(false) }
  }

  return <div className={'game-overlay auth-screen ' + (isDark ? 'dark' : 'light')}>
    <div className="game-modal auth-modal">
      <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>

      {step === 'verify' ? <>
        <div className="result-kicker">CHECK YOUR EMAIL</div>
        <h1>Enter your code.</h1>
        <p className="result-copy">We sent a verification code to <b>{email}</b>. Enter it here to finish setting up your account.</p>
        <label className="field-label">VERIFICATION CODE</label>
        <input className="profile-input auth-input auth-code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="00000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        {error && <div className="answer-feedback negative auth-error"><div><b>ERROR</b><span>{error}</span></div></div>}
        <button className="save-profile btn-shine auth-submit" disabled={busy || code.length < 6} onClick={verify}>{busy ? 'VERIFYING…' : 'VERIFY EMAIL'}</button>
        <button className="auth-link-button" disabled={busy} onClick={resend}>RESEND CODE</button>
        <button className="auth-link-button muted" disabled={busy} onClick={() => { setStep('details'); setError(null) }}>CHANGE EMAIL</button>
      </> : <>
        <div className="result-kicker">{intent === 'save' ? 'SAVE YOUR PROGRESS' : 'COMPETITIVE PLAY'}</div>
        <h1>{intent === 'save' ? 'Keep your progress.' : 'Sign in to compete.'}</h1>
        <p className="result-copy">{intent === 'save'
          ? 'Your Level 1 progress is already saved. Create an account to keep your coins, levels and stats when you switch devices.'
          : 'Community and Friend modes require a player account.'}</p>

        <div className="auth-tabs">
          <button className={tab === 'signin' ? 'active' : ''} onClick={() => { setTab('signin'); resetForm() }}>SIGN IN</button>
          <button className={tab === 'create' ? 'active' : ''} onClick={() => { setTab('create'); resetForm() }}>CREATE ACCOUNT</button>
        </div>

        {tab === 'create' && <>
          <label className="field-label">DISPLAY NAME</label>
          <input className="profile-input auth-input" maxLength={24} autoComplete="nickname" placeholder="Your name in the game" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <label className="field-label">PROFILE AVATAR</label>
          <div className="auth-avatar-row">
            <div className="auth-avatar-preview">
              {avatarUrl && !avatarUrl.startsWith('emoji:') ? <img src={avatarUrl} alt="" /> : avatars.find(a => a[0] === avatarChoice)?.[1]}
            </div>
            <div className="auth-avatar-options">
              <div className="avatar-grid auth-avatar-grid">{avatars.map(([id, emoji, name]) =>
                <button type="button" key={id} title={name} className={'avatar-choice ' + (avatarChoice === id && !avatarUrl ? 'active' : '')} onClick={() => { setAvatarChoice(id); setAvatarUrl(null); setAvatarFile(null) }}><span>{emoji}</span></button>
              )}</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const file = e.target.files?.[0] ?? null; setAvatarFile(file); setAvatarUrl(file ? URL.createObjectURL(file) : null) }} />
              <button type="button" className="auth-upload-button" onClick={() => fileRef.current?.click()}>UPLOAD FROM DEVICE / DRIVE</button>
              <small>Image only · max 2 MB</small>
            </div>
          </div>
        </>}

        <label className="field-label">EMAIL</label>
        <input className="profile-input auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="field-label">PASSWORD</label>
        <div className="password-field"><input className="profile-input auth-input" type={showPassword ? 'text' : 'password'} autoComplete={tab === 'create' ? 'new-password' : 'current-password'} placeholder={tab === 'create' ? 'Minimum 6 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'HIDE' : 'SHOW'}</button></div>

        {tab === 'signin' && <button className="auth-link-button forgot-link" disabled={busy || !email.trim()} onClick={sendReset}>FORGOT PASSWORD?</button>}
        {resetSent && <p className="auth-note">If that email has an account, a password reset email has been sent.</p>}
        {tab === 'create' && <p className="auth-note">Your current guest progress stays attached to this account. Email verification completes the conversion.</p>}
        {error && <div className="answer-feedback negative auth-error"><div><b>ERROR</b><span>{error}</span></div></div>}

        <button className="save-profile btn-shine auth-submit" disabled={busy || !email.trim() || (tab === 'create' ? password.length < 6 || displayName.trim().length < 2 : !password)} onClick={submit}>
          {busy ? 'PLEASE WAIT…' : tab === 'create' ? 'CREATE ACCOUNT' : 'SIGN IN'}
        </button>
      </>}
    </div>
  </div>
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
  const [roundCoinsEarned, setRoundCoinsEarned] = useState(0)
  const [coins, setCoins] = useState(initialCoins)
  const [secondsLeft, setSecondsLeft] = useState(isCommunity ? 180 : 120)
  const [finished, setFinished] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryBusy, setRetryBusy] = useState(false)

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
          setRoundCoinsEarned(0)
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
      if (result.coins_awarded) {
        updateCoins(value => value + result.coins_awarded)
        setRoundCoinsEarned(value => value + result.coins_awarded)
      }

      await new Promise(resolve => window.setTimeout(resolve, 450))
      if (!isCommunity && questionIndex === questions.length - 1) {
        const completion = await finishSoloLevel(languageCodes[language], level as number)
        setScore(completion.score)
        setFinished(true)
        if (level === 1 && await isGuestUser()) setShowSavePrompt(true)
      } else if (isCommunity && questionIndex === questions.length - 1) {
        if (!attemptId) throw new Error('Community attempt is missing.')
        const completion = await finishCommunityAttempt(attemptId)
        setScore(completion.score)
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
      setRoundCoinsEarned(0)
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
        <div className="result-stats"><div><b>{score}</b><span>CORRECT</span></div><div><b>+{roundCoinsEarned}</b><span><i className="coin-emoji" aria-label="coin" /> EARNED</span></div><div><b>{coins}</b><span><i className="coin-emoji" aria-label="coin" /> BALANCE</span></div></div>
        <div className="result-actions"><button className="result-primary" onClick={onClose}>BACK TO {isCommunity ? 'ARENA' : 'LEVELS'}</button></div>
      </div>
      {showSavePrompt && <AuthScreen
        isDark={isDark}
        intent="save"
        onClose={() => setShowSavePrompt(false)}
        onSuccess={() => setShowSavePrompt(false)}
      />}
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('trivia9ja.theme') as 'dark' | 'light') || 'dark')
  const [modal, setModal] = useState<Modal>(null)
  const [presentation, setPresentation] = useState<PresentationState | null>(null)
  const [authDestination, setAuthDestination] = useState<'community' | 'friend' | null>(null)
  const [coins, setCoins] = useState(500)
  const [sound, setSound] = useState(true)
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('trivia9ja.avatar') || 'eagle')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(() => localStorage.getItem('trivia9ja.avatarUrl'))
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('trivia9ja.displayName') || 'NaijaGenius_01')
  const [profileAge, setProfileAge] = useState<number | null>(null)
  const [profileBio, setProfileBio] = useState('')
  const [profileStats, setProfileStats] = useState({ levels: 0, correct: 0, answered: 0 })
  const profileFileRef = useRef<HTMLInputElement>(null)
  const isDark = theme === 'dark'
  const selectedAvatarEmoji = profileAvatarUrl?.startsWith('emoji:')
    ? (avatars.find(a => a[0] === profileAvatarUrl.slice(6))?.[1] || '🦅')
    : (avatars.find(a => a[0] === selectedAvatar)?.[1] || '🦅')

  const openProtectedMode = async (destination: 'community' | 'friend') => {
    try {
      await ensurePlayerSession()
      if (await isGuestUser()) {
        setAuthDestination(destination)
        navigate('auth')
        return
      }
      if (destination === 'community') navigate(null, { mode: 'community' })
      else navigate('friend-mode')
    } catch (e) {
      setAuthDestination(destination)
      navigate('auth')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      try {
        const progress = await getPlayerProgress()
        if (!cancelled) setCoins(progress.coins)
        setProfileStats({ levels: progress.levels_completed, correct: progress.total_correct, answered: progress.total_answered })
        const profile = await getPlayerProfile()
        if (!cancelled && profile) {
          setDisplayName(profile.display_name)
          setProfileAge(profile.age)
          setProfileBio(profile.bio || '')
          if (profile.avatar_url?.startsWith('emoji:')) {
            setSelectedAvatar(profile.avatar_url.slice(6))
            setProfileAvatarUrl(profile.avatar_url)
          } else if (profile.avatar_url) {
            setProfileAvatarUrl(profile.avatar_url)
          }
          if (profile.theme !== 'system') setTheme(profile.theme)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    localStorage.setItem('trivia9ja.theme', theme)
    localStorage.setItem('trivia9ja.avatar', selectedAvatar)
    if (profileAvatarUrl) localStorage.setItem('trivia9ja.avatarUrl', profileAvatarUrl)
    else localStorage.removeItem('trivia9ja.avatarUrl')
    localStorage.setItem('trivia9ja.displayName', displayName)
  }, [theme, selectedAvatar, displayName, profileAvatarUrl])

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

  const closeProfileEditor = () => {
    if (window.history.state?.trivia9ja) {
      window.history.go(-2)
    } else {
      setModal(null)
      setPresentation(null)
    }
  }

  if (presentation && !presentation.language) {
    return <LanguageSelectScreen
      isDark={isDark}
      mode={presentation.mode}
      onClose={goBack}
      onStart={language => navigate(null, { ...presentation, language })}
    />
  }

  if (modal === 'auth') {
    return <AuthScreen
      isDark={isDark}
      intent="competitive"
      onClose={() => { setAuthDestination(null); goBack() }}
      onSuccess={async () => {
        const destination = authDestination
        setAuthDestination(null)
        try {
          const [progress, profile] = await Promise.all([getPlayerProgress(), getPlayerProfile()])
          setCoins(progress.coins)
          if (profile) {
            setDisplayName(profile.display_name)
            setProfileAge(profile.age)
            setProfileBio(profile.bio || '')
            if (profile.avatar_url?.startsWith('emoji:')) {
              setSelectedAvatar(profile.avatar_url.slice(6))
              setProfileAvatarUrl(profile.avatar_url)
            } else if (profile.avatar_url) {
              setProfileAvatarUrl(profile.avatar_url)
            }
          }
        } catch {}
        if (destination === 'community') navigate(null, { mode: 'community' })
        else if (destination === 'friend') navigate('friend-mode')
        else goBack()
      }}
    />
  }

  if (presentation?.mode === 'solo' && presentation.language && !presentation.level) {
    return <SoloLevelSelectScreen
      isDark={isDark}
      onClose={goBack}
      onStart={level => navigate(null, { ...presentation, level })}
      onCoinsChange={setCoins}
    />
  }

  if (presentation?.language) {
    return <PresentationScreen
      mode={presentation.mode}
      level={presentation.level ?? null}
      language={presentation.language}
      isDark={isDark}
      onClose={goBack}
      initialCoins={coins}
      onCoinsChange={setCoins}
    />
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
          <button className="avatar-button" onClick={() => navigate('profile')}>{profileAvatarUrl && !profileAvatarUrl.startsWith('emoji:') ? <img src={profileAvatarUrl} alt="" /> : selectedAvatarEmoji}</button>
        </header>
        <div className="brand-area">
          <div className="eyebrow-pill"><span>✦</span> OFFICIAL NIGERIAN TRIVIA</div>
          <h1 className="brand">TRIVIA <em>9JA</em></h1>
        </div>
      </section>

      <section className="right-panel">
        <button className="card-glow-emerald mode-card" onClick={() => navigate(null, { mode: 'solo' })}>
          <div className="card-inner-surface" /><div className="card-top"><span>01 SOLO MODE</span><b>◷ 2 MIN TIMER</b></div>
          <div className="mode-body"><div className="mode-icon"><Icon name="brain" /></div><div className="mode-copy"><h2>THINK FAST. PLAY SMART.</h2><div className="tags"><span className="gold">₦ EARN COINS</span></div></div></div>
          <span className="action-button green btn-shine">PLAY 2-MIN SOLO <Icon name="arrow" /></span>
        </button>
        <button className="card-glow-amber mode-card" onClick={() => openProtectedMode('community')}>
          <div className="card-inner-surface" /><div className="card-top"><span>02 COMMUNITY RANKED</span><b className="gold-badge">🔥 FREE TODAY</b></div>
          <div className="mode-body"><div className="mode-icon gold-icon"><Icon name="trophy" /></div><div className="mode-copy"><h2>Take on the nation.</h2><p>Compete against state champions online!</p></div></div>
          <span className="action-button amber-action btn-shine">PLAY COMMUNITY CHALLENGE <Icon name="arrow" /></span>
        </button>
        <button className="card-glow-friend mode-card friend-card" onClick={() => openProtectedMode('friend')}>
          <div className="card-inner-surface" /><div className="card-top"><span>03 PLAY WITH A FRIEND</span><b className="friend-badge">PRIVATE</b></div>
          <div className="mode-body"><div className="mode-icon friend-icon"><Icon name="users" /></div><div className="mode-copy"><h2>Challenge someone you know.</h2><p>Create a private match or join one with a code.</p></div></div>
          <span className="action-button friend-action btn-shine">PLAY WITH A FRIEND <Icon name="arrow" /></span>
        </button>
        <button className="leaderboard-strip" onClick={() => navigate('leaderboard')}><span className="leader-icon"><Icon name="chart" /></span><span><b>LEADERBOARD</b><small>• Rank #NaijaGenius_01</small></span><Icon name="arrow" /></button>
      </section>
    </div>

    {modal === 'menu' && <Overlay title="Menu & Settings" onClose={goBack}>
      <button className="dialog-action" onClick={() => navigate('edit-profile')}><span><Icon name="edit" /> Edit Profile (DP & Name)</span><Icon name="arrow" /></button>
      <button className="dialog-action" onClick={() => setSound(v => !v)}><span><Icon name="volume" /> Sound FX</span><b className={sound ? 'good' : 'bad'}>{sound ? 'ON' : 'OFF'}</b></button>
      <button className="dialog-action" onClick={() => navigate('leaderboard')}><span><Icon name="trophy" /> National Leaderboard</span><Icon name="arrow" /></button>
      <button className="dialog-action" onClick={() => navigate('topup')}><span><Icon name="zap" /> Top Up Coins</span><Icon name="arrow" /></button>
    </Overlay>}

    {modal === 'profile' && <Overlay title="" onClose={goBack}>
      <div className="profile-cover">
        <div className="profile-cover-mark">TRIVIA <em>9JA</em></div>
      </div>
      <div className="profile-identity">
        <div className="profile-avatar-large">{profileAvatarUrl && !profileAvatarUrl.startsWith('emoji:') ? <img src={profileAvatarUrl} alt="" /> : selectedAvatarEmoji}</div>
        <button className="profile-edit-fab" onClick={() => navigate('edit-profile')} aria-label="Edit profile"><Icon name="edit" /></button>
        <div className="profile-name-row"><div><h2>{displayName}</h2><span>@{displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'player'}</span></div></div>
        {profileBio && <p className="profile-bio">{profileBio}</p>}
        <div className="profile-meta"><span>Nigeria</span>{profileAge ? <span>{profileAge} years</span> : null}</div>
      </div>
      <div className="profile-stats-row">
        <div><b>{profileStats.levels}</b><span>LEVELS</span></div>
        <div><b>{profileStats.answered ? Math.round(profileStats.correct / profileStats.answered * 100) : 0}%</b><span>ACCURACY</span></div>
        <div><b>{coins}</b><span>COINS</span></div>
      </div>
      <div className="profile-section-label">PLAYER STATUS</div>
      <div className="profile-status-card"><span><Icon name="zap" /></span><div><b>{profileStats.answered ? 'Active player' : 'New player'}</b><small>{profileStats.answered ? 'Keep playing to build your record.' : 'Your first round is waiting.'}</small></div></div>
    </Overlay>}

    {modal === 'edit-profile' && <Overlay title="Edit Profile" onClose={goBack}>
      <div className="profile-edit-avatar">
        <div className="profile-avatar-edit">{profileAvatarUrl && !profileAvatarUrl.startsWith('emoji:') ? <img src={profileAvatarUrl} alt="" /> : selectedAvatarEmoji}</div>
        <div><b>Profile photo</b><small>Use an avatar or upload your own photo.</small></div>
      </div>
      <div className="profile-photo-actions">
        <button type="button" className="auth-upload-button" onClick={() => profileFileRef.current?.click()}>UPLOAD PHOTO</button>
        <button type="button" className="auth-upload-button" onClick={() => navigate('avatar-picker')}>CHOOSE AVATAR</button>
      </div>
      <input ref={profileFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const file = e.target.files?.[0] ?? null; setProfileAvatarFile(file); setProfileAvatarUrl(file ? URL.createObjectURL(file) : profileAvatarUrl) }} />
      <label className="field-label">DISPLAY NAME</label><input className="profile-input" maxLength={24} value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <label className="field-label">AGE <span className="optional-label">OPTIONAL</span></label><input className="profile-input" type="number" min="13" max="100" placeholder="Your age" value={profileAge ?? ''} onChange={e => setProfileAge(e.target.value ? Number(e.target.value) : null)} />
      <label className="field-label">BIO <span className="optional-label">OPTIONAL</span></label><textarea className="profile-input profile-bio-input" maxLength={120} placeholder="A little about you" value={profileBio} onChange={e => setProfileBio(e.target.value)} />
      <button className="save-profile btn-shine" onClick={async () => {
        try {
          let avatar = profileAvatarUrl
          if (profileAvatarFile) avatar = await uploadPlayerAvatar(profileAvatarFile)
          await savePlayerProfile({ display_name: displayName, avatar_url: avatar, age: profileAge, bio: profileBio })
          setProfileAvatarUrl(avatar)
          setProfileAvatarFile(null)
          closeProfileEditor()
        } catch (e) {
          window.alert(e instanceof Error ? e.message : 'Could not save your profile.')
        }
      }}><span>✓</span> SAVE PROFILE</button>
    </Overlay>}

    {modal === 'avatar-picker' && <Overlay title="Choose an Avatar" onClose={goBack}>
      <p className="result-copy">Pick a Trivia 9ja avatar. You can change it anytime.</p>
      <div className="avatar-picker-grid">{avatars.map(([id, emoji, name]) => <button key={id} className={'avatar-picker-card ' + (selectedAvatar === id && profileAvatarUrl?.startsWith('emoji:') ? 'active' : '')} onClick={() => { setSelectedAvatar(id); setProfileAvatarUrl('emoji:' + id); setProfileAvatarFile(null); goBack() }}><span>{emoji}</span><small>{name}</small></button>)}</div>
    </Overlay>}

    {modal === 'leaderboard' && <Overlay title="Naija National Rankings" onClose={goBack}>
      <div className="rank-list">{rankings.map(([name, avatar, state, score], i) => <div className="rank-row" key={name}><b>#{i + 1}</b><span>{avatar}</span><div><strong>{name}</strong><small>{state}</small></div><em>{score}</em></div>)}</div>
    </Overlay>}

    {modal === 'friend-mode' && <Overlay title="Play With a Friend" onClose={goBack}>
      <div className="friend-coming">
        <div className="friend-coming-icon"><Icon name="users" /></div>
        <div className="result-kicker">PRIVATE CHALLENGE</div>
        <h3>Challenge a friend.</h3>
        <p>Create or join a private trivia match. The friend-game flow is the next mode to wire into the existing challenge backend.</p>
        <button className="save-profile btn-shine" onClick={goBack}>BACK TO ARENA</button>
      </div>
    </Overlay>}

    {modal === 'topup' && <Overlay title="Top Up Coins" onClose={goBack}>
      <div className="topup-list">{[[200,'₦500'],[500,'₦1,200'],[1200,'₦2,500']].map(([coins, price]) => <button className="topup-pack" key={coins}><b>{coins} COINS</b><span>BUY {price}</span></button>)}</div>
    </Overlay>}
  </main>
}

export default App
