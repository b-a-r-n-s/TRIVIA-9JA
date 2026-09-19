import { useEffect, useState, type ReactNode } from 'react'

type Language = 'English' | 'Hausa' | 'Yorùbá' | 'Igbo'
type Modal = 'menu' | 'profile' | 'edit-profile' | 'leaderboard' | 'topup' | null
type GameMode = 'solo' | 'community'

const languages: Language[] = ['English', 'Hausa', 'Yorùbá', 'Igbo']

const hosts: Record<Language, { name: string; title: string; image: string; location: string; catchphrase: string }> = {
  English: { name: 'Mr. Japer', title: 'Official Host & National Trivia Director', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop', location: 'Lagos, Nigeria', catchphrase: 'Sharp-sharp! Prove to Nigeria say your head sharp!' },
  Hausa: { name: 'Mr. Ahmed', title: 'Kano Wisdom Scholar & TV Host', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop', location: 'Kano, Nigeria', catchphrase: 'Sannu ku da zuwa! Sani shine karfi!' },
  Yorùbá: { name: 'Miss Temi', title: 'Ibadan Glamour & Culture Anchor', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop', location: 'Ibadan, Nigeria', catchphrase: 'Ẹ káàbọ̀ o! Ọpọlọ pẹpẹ l’ọ̀rọ̀ yìí!' },
  Igbo: { name: 'Miss Chiamaka', title: 'Coal City Royal Intellect Anchor', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop', location: 'Enugu, Nigeria', catchphrase: 'Ndewonu! Amamihe na-enye ohere!' },
}

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
    brain: <><path d="M9 4.5A3.5 3.5 0 0 0 5.5 8c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 16a3.5 3.5 0 0 0 6 2.5V5a3.5 3.5 0 0 0-4-.5Z" /><path d="M15 4.5A3.5 3.5 0 0 1 18.5 8c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 17 16a3.5 3.5 0 0 1-6 2.5V5a3.5 3.5 0 0 1 4-.5Z" /></>,
    trophy: <><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 6H3v2a5 5 0 0 0 5 5M17 6h4v2a5 5 0 0 1-5 5M12 15v5M8 20h8" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="M7 15v-4M11 15V7M15 15v-7M19 15V4" /></>,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></>,
    volume: <><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    edit: <><path d="m4 16-.8 4.8L8 20l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17Z" /><path d="m13.5 7.5 3 3" /></>,
  }
  return <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function HostCard({ language }: { language: Language }) {
  const host = hosts[language]
  return <div className="host-wrap">
    <div className="speech-card">
      <div className="host-name">{host.name} ({host.location}) <span className="voice-bars"><i /><i /><i /></span></div>
      <p>“{host.catchphrase}”</p><span className="speech-tail" />
    </div>
    <div className="portrait-frame">
      <img src={host.image} alt={host.name} />
      <span className="live-chip">LIVE HOST</span><span className="live-dot"><i /> LIVE</span>
    </div>
    <div className="host-title"><strong>{host.name} <span>🇳🇬</span></strong><small>{host.title}</small></div>
  </div>
}

function Overlay({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="dialog">
      <button className="dialog-close" onClick={onClose}><Icon name="x" /></button>
      <div className="dialog-heading"><span>TRIVIA 9JA</span><h2>{title}</h2></div>{children}
    </section>
  </div>
}

function PresentationScreen({ mode, language, onClose }: { mode: GameMode; language: Language; onClose: () => void }) {
  const host = hosts[language]
  return <div className="game-overlay">
    <div className="game-modal">
      <div className="game-head"><button className="icon-button" onClick={onClose}><Icon name="x" /></button><div className="game-title">TRIVIA <em>9JA</em></div><div className="game-timer">{mode === 'community' ? '3:00' : '2:00'}</div></div>
      <div className="game-progress"><span /></div>
      <div className="game-status"><span>{mode === 'community' ? 'COMMUNITY CHALLENGE' : 'SOLO MODE'}</span><span className="streak">10 QUESTIONS</span></div>
      <div className="game-host-strip"><img src={host.image} alt="" /><div><b>{host.name} · LIVE COMMENTARY</b><span>“{host.catchphrase}”</span></div><Icon name="mic" /></div>
      <div className="question-label">QUESTION PRESENTATION · {language.toUpperCase()}</div>
      <div className="question-card">
        <small>THE GAME ENGINE WILL RENDER THE REAL QUESTION HERE</small>
        <h2>Your question appears here.</h2>
        <div className="answer-options">{['Answer option A', 'Answer option B', 'Answer option C', 'Answer option D'].map((answer, i) => <button key={answer}><span>{String.fromCharCode(65 + i)}</span>{answer}</button>)}</div>
      </div>
      <div className="auto-note">Presentation layer only. Gameplay state, scoring, timers, persistence and answer handling are intentionally not implemented here.</div>
      <div className="hint-row"><button><b>−</b><span>ELIMINATE</span><small>1 COIN</small></button><button><b>?</b><span>CLUE</span><small>2 COINS</small></button></div>
    </div>
  </div>
}

function App() {
  const [language, setLanguage] = useState<Language>('English')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [modal, setModal] = useState<Modal>(null)
  const [presentation, setPresentation] = useState<GameMode | null>(null)
  const [sound, setSound] = useState(true)
  const [voice, setVoice] = useState(true)
  const [selectedAvatar, setSelectedAvatar] = useState('eagle')
  const [displayName, setDisplayName] = useState('NaijaGenius_01')
  const [tagline, setTagline] = useState('Trivia King & Lagos Genius 👑')
  const isDark = theme === 'dark'
  const selectedAvatarEmoji = selectedAvatarEmoji

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

  const navigate = (nextModal: Modal = null, nextPresentation: GameMode | null = null) => {
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

  if (presentation) return <PresentationScreen mode={presentation} language={language} onClose={goBack} />

  return <main className={'app ' + (isDark ? 'dark' : 'light')}>
    <div className="ambient ambient-green" /><div className="ambient ambient-amber" />
    <div className="workspace">
      <section className="left-panel">
        <header className="topbar">
          <button className="icon-button" onClick={() => navigate('menu')}><Icon name="menu" /></button>
          <div className="coin-display"><span>₦</span><b>500</b></div>
          <button className="topup btn-shine" onClick={() => navigate('topup')}><Icon name="zap" /> TOP UP</button>
          <button className="icon-button amber" onClick={() => setTheme(isDark ? 'light' : 'dark')}><Icon name={isDark ? 'sun' : 'moon'} /></button>
          <button className="avatar-button" onClick={() => navigate('profile')}>{selectedAvatarEmoji}</button>
        </header>
        <div className="brand-area">
          <div className="eyebrow-pill"><span>✦</span> OFFICIAL NIGERIAN TRIVIA</div>
          <h1 className="brand">TRIVIA <em>9JA</em></h1>
          <HostCard language={language} />
        </div>
        <div className="language-area">
          <div className="language-label"><span><Icon name="globe" /> ACTIVE QUIZMASTER HOST</span><button onClick={() => setVoice(v => !v)}><Icon name="mic" /> {voice ? 'Test Voice' : 'Voice Off'}</button></div>
          <div className="language-grid">{languages.map(lang => <button key={lang} className={'language ' + (lang === language ? 'active' : '')} onClick={() => setLanguage(lang)}>{lang}</button>)}</div>
        </div>
      </section>

      <section className="right-panel">
        <button className="card-glow-emerald mode-card" onClick={() => navigate(null, 'solo')}>
          <div className="card-inner-surface" /><div className="card-top"><span>01 SOLO MODE</span><b>◷ 2 MIN TIMER</b></div>
          <div className="mode-body"><div className="mode-icon"><Icon name="brain" /></div><div className="mode-copy"><h2>10 Questions. 800ms Auto-Next.</h2><div className="tags"><span>LIVE VOICE COMMENTARY</span><span className="gold">₦ EARN COINS</span></div></div></div>
          <span className="action-button green btn-shine">PLAY 2-MIN SOLO <Icon name="arrow" /></span>
        </button>
        <button className="card-glow-amber mode-card" onClick={() => navigate(null, 'community')}>
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
      <button className="dialog-action" onClick={() => setVoice(v => !v)}><span><Icon name="mic" /> Quizmaster TTS Voice</span><b className={voice ? 'good' : 'bad'}>{voice ? 'ENABLED' : 'MUTED'}</b></button>
      <button className="dialog-action" onClick={() => setSound(v => !v)}><span><Icon name="volume" /> Sound FX</span><b className={sound ? 'good' : 'bad'}>{sound ? 'ON' : 'OFF'}</b></button>
      <button className="dialog-action" onClick={() => navigate('leaderboard')}><span><Icon name="trophy" /> National Leaderboard</span><Icon name="arrow" /></button>
      <button className="dialog-action" onClick={() => navigate('topup')}><span><Icon name="zap" /> Top Up Coins</span><Icon name="arrow" /></button>
    </Overlay>}

    {modal === 'profile' && <Overlay title="Your Profile" onClose={() => setModal(null)}>
      <div className="profile-header"><div className="profile-avatar">{avatars.find(a => a[0] === selectedAvatar)?.[1] || '🦅'}</div><div><b>{displayName}</b><span>{tagline}</span><small>Lagos State 🇳🇬</small></div></div>
      <button className="dialog-action" onClick={() => navigate('edit-profile')}><span><Icon name="edit" /> EDIT PROFILE</span><Icon name="arrow" /></button>
    </Overlay>}

    {modal === 'edit-profile' && <Overlay title="Edit Your Profile" onClose={() => setModal(null)}>
      <label className="field-label">SELECT DISPLAY AVATAR (DP)</label>
      <div className="avatar-grid">{avatars.map(([id, emoji, name]) => <button key={id} className={'avatar-choice ' + (selectedAvatar === id ? 'active' : '')} onClick={() => setSelectedAvatar(id)}><span>{emoji}</span><small>{name}</small></button>)}</div>
      <label className="field-label">DISPLAY NAME</label><input className="profile-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <label className="field-label">BIO / TAGLINE</label><input className="profile-input" value={tagline} onChange={e => setTagline(e.target.value)} />
      <button className="save-profile btn-shine" onClick={() => navigate('profile')}><span>✓</span> SAVE PROFILE EDITS</button>
    </Overlay>}

    {modal === 'leaderboard' && <Overlay title="Naija National Rankings" onClose={() => setModal(null)}>
      <div className="rank-list">{rankings.map(([name, avatar, state, score], i) => <div className="rank-row" key={name}><b>#{i + 1}</b><span>{avatar}</span><div><strong>{name}</strong><small>{state}</small></div><em>{score}</em></div>)}</div>
    </Overlay>}

    {modal === 'topup' && <Overlay title="Top Up Coins" onClose={() => setModal(null)}>
      <div className="topup-list">{[[200,'₦500'],[500,'₦1,200'],[1200,'₦2,500']].map(([coins, price]) => <button className="topup-pack" key={coins}><b>{coins} COINS</b><span>BUY {price}</span></button>)}</div>
    </Overlay>}
  </main>
}

export default App
