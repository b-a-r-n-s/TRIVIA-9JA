import { useState } from 'react'

type Language = 'English' | 'Hausa' | 'Yorùbá' | 'Igbo'
type View = 'home' | 'solo' | 'community' | 'leaderboard' | 'profile' | 'settings'

const languages: Language[] = ['English', 'Hausa', 'Yorùbá', 'Igbo']

const hosts: Record<Language, {
  name: string
  title: string
  image: string
  location: string
  catchphrase: string
}> = {
  English: {
    name: 'Mr. Jasper',
    title: 'Official Host & National Trivia Director',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
    location: 'Lagos, Nigeria',
    catchphrase: 'Sharp-sharp! Prove to Nigeria say your head sharp!',
  },
  Hausa: {
    name: 'Mr. Ahmed',
    title: 'Kano Wisdom Scholar & TV Host',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
    location: 'Kano, Nigeria',
    catchphrase: 'Sannu ku da zuwa! Sani shine karfi!',
  },
  Yorùbá: {
    name: 'Miss Temi',
    title: 'Ibadan Glamour & Culture Anchor',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
    location: 'Ibadan, Nigeria',
    catchphrase: 'Ẹ káàbọ̀ o! Ọpọlọ pẹpẹ l’ọ̀rọ̀ yìí!',
  },
  Igbo: {
    name: 'Miss Chiamaka',
    title: 'Coal City Royal Intellect Anchor',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop',
    location: 'Enugu, Nigeria',
    catchphrase: 'Ndewonu! Amamihe na-enye ohere!',
  },
}

const navItems = [
  ['home', 'Home'],
  ['leaderboard', 'Leaderboard'],
  ['profile', 'Profile'],
  ['settings', 'Settings'],
] as const

function Icon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>,
    brain: <><path d="M9 4.5A3.5 3.5 0 0 0 5.5 8c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 16a3.5 3.5 0 0 0 6 2.5V5a3.5 3.5 0 0 0-4-0.5Z"/><path d="M15 4.5A3.5 3.5 0 0 1 18.5 8c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 17 16a3.5 3.5 0 0 1-6 2.5V5a3.5 3.5 0 0 1 4-.5Z"/><path d="M9 8h2M13 8h2M8 12h3M13 13h3"/></>,
    trophy: <><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z"/><path d="M7 6H3v2a5 5 0 0 0 5 5M17 6h4v2a5 5 0 0 1-5 5M12 15v5M8 20h8"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    x: <><path d="m6 6 12 12M18 6 6 18"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="M7 15v-4M11 15V7M15 15v-7M19 15V4"/></>,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function HostCard({ language, reaction = 'idle' }: { language: Language; reaction?: 'idle' | 'correct' | 'wrong' }) {
  const host = hosts[language]
  const badge = reaction === 'correct'
    ? '🔥 IMPRESSED!'
    : reaction === 'wrong'
      ? '😬 OUCH! FALL HAND!'
      : 'LIVE HOST'

  return (
    <div className="host-wrap">
      <div className="speech-card">
        <div className="host-name">{host.name} · {host.location}</div>
        <p>“{host.catchphrase}”</p>
        <span className="speech-tail" />
      </div>
      <div className={`portrait-frame reaction-${reaction}`}>
        <img src={host.image} alt={host.name} />
        <span className="live-chip">{badge}</span>
        <span className="live-dot">● LIVE</span>
      </div>
      <div className="host-title">
        <strong>{host.name} 🇳🇬</strong>
        <small>{host.title}</small>
      </div>
    </div>
  )
}

function Home({ language, setLanguage, onPlay, onLeaderboard }: {
  language: Language
  setLanguage: (language: Language) => void
  onPlay: (view: 'solo' | 'community') => void
  onLeaderboard: () => void
}) {
  return (
    <div className="workspace">
      <section className="left-panel">
        <div className="topbar">
          <button className="icon-button" aria-label="Menu"><Icon name="menu" /></button>
          <div className="coin-display"><span>₦</span><b>500</b></div>
          <button className="topup"><Icon name="zap" /> TOP UP</button>
          <button className="icon-button amber" aria-label="Theme"><Icon name="sun" /></button>
          <button className="avatar-button" aria-label="Profile"><Icon name="user" /></button>
        </div>

        <div className="brand-area">
          <div className="eyebrow-pill">✦ OFFICIAL NIGERIAN TRIVIA</div>
          <h1 className="brand">TRIVIA <em>9JA</em></h1>
          <HostCard language={language} />
        </div>

        <div className="language-area">
          <div className="language-label"><span><Icon name="globe" /> ACTIVE QUIZMASTER HOST</span><button>◉ Test Voice</button></div>
          <div className="language-grid">
            {languages.map(item => (
              <button key={item} className={item === language ? 'language active' : 'language'} onClick={() => setLanguage(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="right-panel">
        <button className="mode-card emerald" onClick={() => onPlay('solo')}>
          <div className="card-top"><span>01 SOLO MODE</span><b>◷ 2 MIN TIMER</b></div>
          <div className="mode-body">
            <div className="mode-icon"><Icon name="brain" /></div>
            <div>
              <h2>10 Questions. 800ms Auto-Next.</h2>
              <div className="tags"><span>LIVE VOICE COMMENTARY</span><span className="gold">₦ EARN COINS</span></div>
            </div>
          </div>
          <span className="action-button green">PLAY 2-MIN SOLO <Icon name="arrow" /></span>
        </button>

        <button className="mode-card gold" onClick={() => onPlay('community')}>
          <div className="card-top"><span>02 COMMUNITY RANKED</span><b className="gold-badge">🔥 FREE TODAY</b></div>
          <div className="mode-body">
            <div className="mode-icon gold-icon"><Icon name="trophy" /></div>
            <div>
              <h2>Take on the nation.</h2>
              <p>Compete against state champions online!</p>
            </div>
          </div>
          <span className="action-button amber-action">PLAY COMMUNITY CHALLENGE <Icon name="arrow" /></span>
        </button>

        <button className="leaderboard-strip" onClick={onLeaderboard}>
          <span className="leader-icon"><Icon name="chart" /></span>
          <span><b>LEADERBOARD</b><small>• See who knows Naija.</small></span>
          <Icon name="arrow" />
        </button>
      </section>
    </div>
  )
}

function GamePreview({ mode, language, onBack }: { mode: 'solo' | 'community'; language: Language; onBack: () => void }) {
  const community = mode === 'community'
  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="icon-button" onClick={onBack}><Icon name="x" /></button>
        <div className="game-logo">TRIVIA <em>9JA</em></div>
        <div className={community ? 'timer urgent' : 'timer'}>◷ {community ? '2:59' : '1:59'}</div>
      </header>
      <div className="progress"><span /></div>
      <HostCard language={language} />
      <section className="question-panel">
        <div className="question-meta"><span>{community ? 'COMMUNITY CHALLENGE' : 'QUESTION 01/10'}</span><span>{language}</span></div>
        <div className="question-card">
          <small>NIGERIAN TRIVIA</small>
          <h2>Which Nigerian city is famously known as the “Coal City”?</h2>
        </div>
        <div className="answer-grid">
          {['Ibadan', 'Enugu', 'Abeokuta', 'Jos'].map((answer, i) => (
            <button key={answer}><span>{String.fromCharCode(65 + i)}</span>{answer}</button>
          ))}
        </div>
        <div className="hint-row">
          <button><b>−</b><span>ELIMINATE</span><small>1 COIN</small></button>
          <button><b>?</b><span>CLUE</span><small>2 COINS</small></button>
        </div>
      </section>
    </div>
  )
}

function Overlay({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay">
      <section className="dialog">
        <button className="dialog-close" onClick={onClose}><Icon name="x" /></button>
        <div className="dialog-heading"><span>TRIVIA 9JA</span><h2>{title}</h2></div>
        {children}
      </section>
    </div>
  )
}

function App() {
  const [view, setView] = useState<View>('home')
  const [language, setLanguage] = useState<Language>('English')
  const [overlay, setOverlay] = useState<'menu' | 'profile' | 'settings' | null>(null)

  if (view === 'solo' || view === 'community') {
    return <GamePreview mode={view} language={language} onBack={() => setView('home')} />
  }

  return (
    <main className="app">
      {view === 'home' && (
        <Home language={language} setLanguage={setLanguage} onPlay={setView} onLeaderboard={() => setView('leaderboard')} />
      )}

      {view === 'leaderboard' && (
        <div className="inner-page">
          <button className="back-link" onClick={() => setView('home')}>← BACK HOME</button>
          <p className="eyebrow">COMPETITIVE · {language.toUpperCase()}</p>
          <h1>Naija National Rankings</h1>
          <div className="rank-list">
            {['Chidi_Lagos', 'Amina_Abuja', 'Tunde_Vibes', 'Emeka_PH', 'Zainab_Kano'].map((name, i) => (
              <div className="rank-row" key={name}><b>#{i + 1}</b><span>{['👑','🦅','⚡','🔥','✨'][i]}</span><strong>{name}</strong><small>{[18450,16920,14100,12850,11200][i]} pts</small></div>
            ))}
          </div>
        </div>
      )}

      {view === 'profile' && (
        <div className="inner-page">
          <button className="back-link" onClick={() => setView('home')}>← BACK HOME</button>
          <p className="eyebrow">PLAYER PROFILE</p>
          <h1>NaijaGenius_01</h1>
          <p className="profile-copy">Trivia King & Lagos Genius</p>
          <div className="profile-stat-grid"><div><small>COINS</small><b>500</b></div><div><small>STREAK</small><b>8x</b></div><div><small>RANK</small><b>#42</b></div></div>
        </div>
      )}

      {view === 'settings' && (
        <div className="inner-page">
          <button className="back-link" onClick={() => setView('home')}>← BACK HOME</button>
          <p className="eyebrow">SETTINGS</p>
          <h1>Experience controls</h1>
          <div className="settings-list"><button>Quizmaster voice <b>ON</b></button><button>Sound effects <b>ON</b></button><button>Theme <b>DARK</b></button></div>
        </div>
      )}

      {view === 'home' && overlay === 'menu' && (
        <Overlay title="Menu & Settings" onClose={() => setOverlay(null)}>
          <button className="dialog-action" onClick={() => { setOverlay(null); setView('profile') }}>Profile & settings <Icon name="arrow" /></button>
          <button className="dialog-action" onClick={() => { setOverlay(null); setView('leaderboard') }}>National leaderboard <Icon name="arrow" /></button>
          <button className="dialog-action" onClick={() => { setOverlay(null); setView('settings') }}>Experience controls <Icon name="arrow" /></button>
        </Overlay>
      )}

      {view === 'home' && overlay === 'profile' && (
        <Overlay title="Your Profile" onClose={() => setOverlay(null)}>
          <div className="profile-card"><div className="profile-avatar"><Icon name="user" /></div><div><b>NaijaGenius_01</b><small>Lagos State 🇳🇬</small></div></div>
          <button className="dialog-action">EDIT PROFILE <Icon name="arrow" /></button>
        </Overlay>
      )}

      {view === 'home' && overlay === 'settings' && (
        <Overlay title="Settings" onClose={() => setOverlay(null)}>
          <button className="dialog-action">Quizmaster TTS <b>ENABLED</b></button>
          <button className="dialog-action">Sound FX <b>ON</b></button>
          <button className="dialog-action">Theme <b>DARK</b></button>
        </Overlay>
      )}

      {view === 'home' && (
        <div className="floating-controls">
          <button className="icon-button" onClick={() => setOverlay('menu')}><Icon name="menu" /></button>
          <button className="avatar-button" onClick={() => setOverlay('profile')}><Icon name="user" /></button>
        </div>
      )}
    </main>
  )
}

export default App
