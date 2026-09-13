import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ha', label: 'Hausa', short: 'HA' },
  { code: 'yo', label: 'Yorùbá', short: 'YO' },
  { code: 'ig', label: 'Igbo', short: 'IG' },
] as const

type Language = (typeof languages)[number]['code']
type Screen = 'home' | 'levels' | 'solo' | 'community' | 'leaderboard' | 'profile'

type Question = {
  prompt: string
  options: string[]
  answer: string
  type: 'multiple' | 'riddle'
}

const demoQuestions: Record<Language, Question[]> = {
  en: [
    { prompt: 'Which Nigerian city is widely known as the Coal City?', options: ['Enugu', 'Jos', 'Kaduna', 'Ilorin'], answer: 'Enugu', type: 'multiple' },
    { prompt: 'I have a mouth but never eat. I have a bed but never sleep. What am I?', options: ['A river', 'A road', 'A pot', 'A drum'], answer: 'A river', type: 'riddle' },
    { prompt: 'Which body of water gives Lagos its lagoon-facing character?', options: ['Lagos Lagoon', 'Lake Chad', 'River Niger', 'Cross River'], answer: 'Lagos Lagoon', type: 'multiple' },
  ],
  ha: [
    { prompt: 'Wane gari ne aka fi danganta shi da kwal?', options: ['Enugu', 'Jos', 'Kaduna', 'Ilorin'], answer: 'Enugu', type: 'multiple' },
    { prompt: 'Ina da baki amma ba na ci. Ina da gado amma ba na barci. Ni wanene?', options: ['Kogi', 'Hanya', 'Tukunya', 'Ganguna'], answer: 'Kogi', type: 'riddle' },
  ],
  yo: [
    { prompt: 'Ilu wo ni a n pe ni Ilu Eedu?', options: ['Enugu', 'Jos', 'Kaduna', 'Ilorin'], answer: 'Enugu', type: 'multiple' },
    { prompt: 'Mo ni enu sugbon mi o jeun. Mo ni ibusun sugbon mi o sun. Kini mo je?', options: ['Odo', 'Opopona', 'Ikoko', 'Agogo'], answer: 'Odo', type: 'riddle' },
  ],
  ig: [
    { prompt: 'Kedu obodo a na-akpọ Coal City?', options: ['Enugu', 'Jos', 'Kaduna', 'Ilorin'], answer: 'Enugu', type: 'multiple' },
    { prompt: 'Enwere m ọnụ ma anaghị m eri nri. Enwere m akwa ma anaghị m ehi ụra. Gịnị ka m bụ?', options: ['Osimiri', 'Ụzọ', 'Ite', 'Ịgba'], answer: 'Osimiri', type: 'riddle' },
  ],
}

function BrainIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M31 12c-7-6-17-1-16 7-7 1-9 10-4 14-5 6 0 14 7 13 1 8 12 9 16 3M33 12c7-6 17-1 16 7 7 1 9 10 4 14 5 6 0 14-7 13-1 8-12 9-16 3M31 12v37M22 21c4 0 7 3 7 7M42 21c-4 0-7 3-7 7M18 37c5 0 8-2 10-5M46 37c-5 0-8-2-10-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
}

function TrophyIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M21 11h22v17c0 8-5 14-11 14s-11-6-11-14V11Z" fill="none" stroke="currentColor" strokeWidth="2.4"/><path d="M21 17H12v5c0 8 5 12 11 12M43 17h9v5c0 8-5 12-11 12M32 42v10M23 54h18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
}

function Arrow() { return <span className="arrow">→</span> }

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [language, setLanguage] = useState<Language>('en')
  const [signedIn, setSignedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coins, setCoins] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [communitySeconds, setCommunitySeconds] = useState(120)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (screen !== 'community' || communitySeconds <= 0) return
    const timer = window.setInterval(() => setCommunitySeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [screen, communitySeconds])

  const questions = useMemo(() => demoQuestions[language], [language])
  const question = questions[questionIndex % questions.length]
  const progress = ((questionIndex + 1) / 10) * 100

  const goHome = () => { setScreen('home'); setMenuOpen(false) }
  const startSolo = () => { setQuestionIndex(0); setSelected(null); setScore(0); setScreen('solo') }
  const startCommunity = () => { setQuestionIndex(0); setSelected(null); setScore(0); setCommunitySeconds(120); setScreen('community') }

  const answer = (option: string) => {
    if (selected) return
    setSelected(option)
    if (option === question.answer) setScore((value) => value + 1)
  }

  const nextQuestion = () => {
    setSelected(null)
    if (questionIndex >= 9) {
      if (screen === 'solo') setCoins((value) => value + score + (selected === question.answer ? 1 : 0))
      setScreen('home')
      return
    }
    setQuestionIndex((value) => value + 1)
  }

  const languageControl = (
    <div className="language-control">
      {languages.map((item) => (
        <button key={item.code} className={language === item.code ? 'language active' : 'language'} onClick={() => setLanguage(item.code)}>
          <span className="language-short">{item.short}</span>{item.label}
        </button>
      ))}
    </div>
  )

  if (screen === 'solo' || screen === 'community') {
    const community = screen === 'community'
    const isCorrect = selected === question.answer
    return (
      <main className="game-shell">
        <header className="game-topbar">
          <button className="back-button" onClick={goHome}>←</button>
          <div className="game-brand" onClick={goHome}>TRIVIA <b>9JA</b></div>
          <div className="game-stat">{community ? `${Math.floor(communitySeconds / 60)}:${String(communitySeconds % 60).padStart(2, '0')}` : `◉ ${coins}`}</div>
        </header>
        <div className="game-progress"><span style={{ width: community ? `${(communitySeconds / 120) * 100}%` : `${progress}%` }} /></div>
        <section className="question-stage">
          <div className="question-meta"><span>{community ? 'COMMUNITY CHALLENGE' : `LEVEL 1 · QUESTION ${questionIndex + 1}/10`}</span><span>{languages.find((x) => x.code === language)?.label}</span></div>
          <div className="question-card">
            <span className="question-type">{question.type === 'riddle' ? 'BRAIN TEASER' : 'NIGERIAN TRIVIA'}</span>
            <h1>{question.prompt}</h1>
          </div>
          <div className="answers">
            {question.options.map((option, index) => {
              const state = selected ? option === question.answer ? 'correct' : option === selected ? 'wrong' : '' : ''
              return <button key={option} className={`answer ${state}`} onClick={() => answer(option)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>
            })}
          </div>
          {selected && <div className={`feedback ${isCorrect ? 'good' : 'bad'}`}><strong>{isCorrect ? 'CORRECT.' : 'NOT QUITE.'}</strong><span>{isCorrect ? '+1 point' : `The answer is ${question.answer}.`}</span><button onClick={nextQuestion}>{questionIndex >= 9 ? 'FINISH' : 'NEXT'} <Arrow /></button></div>}
        </section>
      </main>
    )
  }

  if (screen === 'levels') {
    return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={goHome}>←</button><div><p className="eyebrow">SOLO MODE</p><h1>Choose your level.</h1></div><span className="coin-pill">◉ {coins}</span></header><section className="levels-grid">{Array.from({ length: 10 }, (_, i) => { const unlocked = i === 0; return <button disabled={!unlocked} className={`level-tile ${unlocked ? 'unlocked' : 'locked'}`} key={i} onClick={startSolo}><span>{String(i + 1).padStart(2, '0')}</span><strong>{['Roots & Places', 'Slang & Pidgin', 'History', 'Food & Markets', 'Music', 'Sport', 'Nollywood', 'Language', 'Culture', 'Naija Genius'][i]}</strong><small>{unlocked ? 'READY TO PLAY' : 'LOCKED'}</small></button> })}</section></main>
  }

  if (screen === 'leaderboard') {
    const rows = ['Amaka', 'Tunde', 'Chiamaka', 'Musa', 'You'].map((name, i) => ({ name, score: [94, 91, 88, 84, 0][i] }))
    return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={goHome}>←</button><div><p className="eyebrow">COMMUNITY</p><h1>The nation’s best.</h1></div></header><div className="leaderboard-full"><div className="leaderboard-tabs"><button className="active">ALL TIME</button><button>THIS WEEK</button><button>{languages.find((x) => x.code === language)?.short}</button></div>{rows.map((row, i) => <div className={`rank-row ${row.name === 'You' ? 'you' : ''}`} key={row.name}><span className="rank">{String(i + 1).padStart(2, '0')}</span><span className="avatar">{row.name[0]}</span><strong>{row.name}</strong><span>{row.score || '—'} pts</span></div>)}</div></main>
  }

  if (screen === 'profile') {
    return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={goHome}>←</button><div><p className="eyebrow">YOUR ACCOUNT</p><h1>{signedIn ? 'Your profile.' : 'Join the game.'}</h1></div></header><section className="profile-card"><div className="profile-avatar">{signedIn ? 'B' : '?'}</div><h2>{signedIn ? 'Player' : 'Not signed in'}</h2><p>{signedIn ? 'Your scores, coins and progress stay with your account.' : 'Create an account to appear on the community leaderboard and keep your progress.'}</p><button className="primary-action" onClick={() => setScreen('home')}>{signedIn ? 'BACK TO HOME' : 'SIGN UP / SIGN IN'} <Arrow /></button></section></main>
  }

  return (
    <main className="app-shell">
      <div className="pattern" aria-hidden="true" />
      <header className="topbar">
        <button className="mini-mark" onClick={goHome}>T9</button>
        <div className="topbar-actions">
          <span className="coin-pill">◉ {coins}</span>
          <span className="status-dot" />
          <span>{signedIn ? 'SIGNED IN' : 'GUEST'}</span>
          <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">☰</button>
        </div>
        {menuOpen && <div className="quick-menu"><button onClick={() => setScreen('profile')}>Profile</button><button onClick={() => setScreen('leaderboard')}>Leaderboard</button><button onClick={() => setScreen('home')}>Sound settings</button></div>}
      </header>

      <section className="hero">
        <p className="eyebrow">OFFICIAL NIGERIAN TRIVIA</p>
        <h1><span>TRIVIA</span> <em>9JA</em></h1>
        <p className="tagline">You say you’re a Naija genius? Prove it.</p>
        <div className="gold-line" />
        <div className="hero-pattern" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>

      <section className="language-section" aria-label="Language">
        <p className="section-label">PLAY IN YOUR LANGUAGE</p>
        {languageControl}
      </section>

      <section className="modes" aria-label="Game modes">
        <article className="mode-card solo-card">
          <div className="mode-topline"><span>01</span><span>SOLO MODE</span></div>
          <div className="mode-visual"><div className="orb"><BrainIcon /></div></div>
          <div className="mode-copy"><h2>Test your<br />knowledge.</h2><p>Climb through 10 levels of Nigerian culture, history, language and everyday brilliance.</p><div className="mode-meta"><span>10 LEVELS</span><span>+ COINS</span></div><button className="primary-action" onClick={() => setScreen('levels')}>PLAY SOLO <Arrow /></button></div>
        </article>

        <article className="mode-card community-card">
          <div className="mode-topline"><span>02</span><span>COMMUNITY CHALLENGE</span></div>
          <div className="mode-visual"><div className="orb gold"><TrophyIcon /></div></div>
          <div className="mode-copy"><h2>Take on<br />the nation.</h2><p>Two minutes. One score. See how you rank against other Naija minds.</p><div className="mode-meta"><span>2 MIN</span><span>LEADERBOARD</span><span className="free">FREE TODAY</span></div><button className="secondary-action" onClick={startCommunity}>PLAY COMMUNITY CHALLENGE <Arrow /></button></div><div className="free-badge">✦ FREE TODAY</div>
        </article>
      </section>

      <button className="leaderboard-preview" onClick={() => setScreen('leaderboard')}><div className="bars"><i /><i /><i /><i /></div><div><p className="section-label">LEADERBOARD</p><h3>See where you rank among Naija minds.</h3></div><Arrow /></button>
      <footer><span>NAIJA KNOWS</span><i /> KNOWLEDGE IS CULTURE</footer>
    </main>
  )
}

export default App
