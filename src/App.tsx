import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'ig', label: 'Igbo' },
] as const

type Language = (typeof languages)[number]['code']

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session))
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <main className="app-shell">
      <div className="pattern" aria-hidden="true" />
      <header className="topbar">
        <div className="mini-mark">T9</div>
        <div className="topbar-actions">
          <span className="status-dot" />
          <span>{signedIn ? 'SIGNED IN' : 'GUEST'}</span>
          <button className="icon-button" aria-label="Sound settings">◒</button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">OFFICIAL NIGERIAN TRIVIA</p>
        <h1><span>TRIVIA</span> <em>9JA</em></h1>
        <p className="tagline">You say you’re a Naija genius? Prove it.</p>
        <div className="gold-line" />
      </section>

      <section className="language-section" aria-label="Language">
        <p className="section-label">PLAY IN YOUR LANGUAGE</p>
        <div className="language-control">
          {languages.map((item) => (
            <button
              key={item.code}
              className={language === item.code ? 'language active' : 'language'}
              onClick={() => setLanguage(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="modes" aria-label="Game modes">
        <article className="mode-card solo-card">
          <div className="mode-topline"><span>01</span><span>SOLO MODE</span></div>
          <div className="mode-icon">✦</div>
          <h2>Test your<br />knowledge.</h2>
          <p>Climb through 10 levels of Nigerian culture, history, language and everyday brilliance.</p>
          <div className="mode-meta"><span>LEVEL 1</span><span>10 LEVELS</span><span>+ COINS</span></div>
          <button className="primary-action">PLAY SOLO <span>↗</span></button>
        </article>

        <article className="mode-card community-card">
          <div className="mode-topline"><span>02</span><span>COMMUNITY</span></div>
          <div className="mode-icon trophy">♛</div>
          <h2>Take on<br />the nation.</h2>
          <p>Two minutes. One score. See how you rank against other Naija minds.</p>
          <div className="mode-meta"><span>2 MIN</span><span>LEADERBOARD</span><span className="free">FREE TODAY</span></div>
          <button className="secondary-action">PLAY CHALLENGE <span>↗</span></button>
        </article>
      </section>

      <section className="leaderboard-preview">
        <div>
          <p className="section-label">THE NATION’S BEST</p>
          <h3>Community leaderboard</h3>
        </div>
        <button className="text-button">VIEW ALL <span>→</span></button>
      </section>

      <footer>NAIJA KNOWS <span>·</span> KNOWLEDGE IS CULTURE</footer>
    </main>
  )
}

export default App
