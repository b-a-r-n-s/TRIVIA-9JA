import { useEffect, useState, type FormEvent } from 'react'
import { linkGuestEmail, supabase } from '../lib/supabase'

export default function ProfilePanel({ onClose }: { onClose: () => void }) {
  const [displayName, setDisplayName] = useState('Naija Player')
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [language, setLanguage] = useState('en')
  const [saved, setSaved] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [hasUser, setHasUser] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkError, setLinkError] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const loadProfile = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    setHasUser(Boolean(user))
    if (!user) return
    setAnonymous(Boolean(user.is_anonymous))
    const { data: profile } = await supabase.from('profiles').select('display_name,username,theme,preferred_language').eq('user_id', user.id).maybeSingle()
    if (profile) {
      setDisplayName(profile.display_name || 'Naija Player')
      setUsername(profile.username || '')
      setTheme(profile.theme || 'dark')
      setLanguage(profile.preferred_language || 'en')
    }
  }

  useEffect(() => {
    void loadProfile()
    const { data } = supabase.auth.onAuthStateChange(() => { void loadProfile() })
    return () => data.subscription.unsubscribe()
  }, [])

  const save = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || 'Naija Player',
      username: username.trim().toLowerCase(),
      theme,
      preferred_language: language,
    }).eq('user_id', user.id)
    if (!error) {
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    }
  }

  const protectProgress = async () => {
    setLinking(true); setLinkMessage(''); setLinkError('')
    try {
      await linkGuestEmail(accountEmail)
      setAnonymous(false)
      setLinkMessage('Check your email to confirm. Your progress stays on this player.')
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Could not protect your progress.')
    } finally { setLinking(false) }
  }

  const submitAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAuthBusy(true); setAuthError('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    if (result.error) setAuthError(result.error.message)
    else {
      setAuthMode(null); setAuthEmail(''); setAuthPassword(''); setAnonymous(false); setHasUser(true)
      await loadProfile()
    }
    setAuthBusy(false)
  }

  const needsAccount = !hasUser || anonymous

  return <div className="profile-overlay">
    <section className="profile-panel">
      <header className="profile-panel-head">
        <div><p className="eyebrow">PLAYER PROFILE</p><h2>Your TRIVIA 9JA identity.</h2></div>
        <button onClick={onClose} className="auth-close" aria-label="Close">×</button>
      </header>

      <div className="profile-identity">
        <div className="large-avatar">{displayName.trim().charAt(0).toUpperCase() || '?'}</div>
        <div><strong>@{username || 'player'}</strong><span>{hasUser && !anonymous ? 'Naija knowledge seeker' : 'Player access required'}</span></div>
      </div>

      {needsAccount && <div className="account-gate">
        <p className="eyebrow">PLAYER ACCESS</p>
        <h3>{hasUser ? 'Save your progress.' : 'Enter the game.'}</h3>
        <p>{anonymous ? 'Guest play is currently unavailable on this build. Sign in or create a player account to continue.' : 'Create a player account or sign in before starting a round.'}</p>
        <div className="account-gate-actions">
          <button className="primary-action" onClick={() => { setAuthMode('signin'); setAuthError('') }}>SIGN IN <span className="arrow">→</span></button>
          <button className="secondary-action" onClick={() => { setAuthMode('signup'); setAuthError('') }}>CREATE ACCOUNT <span className="arrow">→</span></button>
        </div>
      </div>}

      {anonymous && <div className="settings-grid" style={{ marginBottom: 18 }}>
        <label>SAVE YOUR PROGRESS<input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        <button className="primary-action" onClick={protectProgress} disabled={linking}>{linking ? 'SENDING…' : 'PROTECT MY PROGRESS →'}</button>
        {linkMessage && <p className="auth-message">{linkMessage}</p>}
        {linkError && <p className="auth-message" style={{background:'#361917',color:'#e7a49a'}}>{linkError}</p>}
      </div>}

      {hasUser && <>
        <div className="settings-grid">
          <label>DISPLAY NAME<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={24}/></label>
          <label>USERNAME<input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={24}/></label>
          <label>LANGUAGE<select value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="ha">Hausa</option><option value="yo">Yorùbá</option><option value="ig">Igbo</option></select></label>
          <label>APPEARANCE<select value={theme} onChange={e => setTheme(e.target.value as typeof theme)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
        </div>
        <div className="profile-actions"><button className="secondary-action" onClick={onClose}>CANCEL</button><button className="primary-action" onClick={save}>{saved ? 'SAVED ✓' : 'SAVE CHANGES →'}</button></div>
      </>}

      {authMode && <div className="profile-auth-inline">
        <div className="profile-auth-head"><div><p className="eyebrow">TRIVIA 9JA</p><h3>{authMode === 'signup' ? 'Create your player account.' : 'Welcome back.'}</h3></div><button onClick={() => setAuthMode(null)} className="auth-close" aria-label="Close authentication">×</button></div>
        <form onSubmit={submitAuth} className="auth-form-inline">
          <label>EMAIL<input value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" required autoComplete="email"/></label>
          <label>PASSWORD<input value={authPassword} onChange={e => setAuthPassword(e.target.value)} type="password" required minLength={6} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}/></label>
          {authError && <p className="auth-message error">{authError}</p>}
          <button className="primary-action" type="submit" disabled={authBusy}>{authBusy ? 'PLEASE WAIT…' : authMode === 'signup' ? 'CREATE ACCOUNT →' : 'SIGN IN →'}</button>
        </form>
        <button className="secondary-action" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthError('') }}>{authMode === 'signup' ? 'ALREADY HAVE AN ACCOUNT? SIGN IN' : 'NEED AN ACCOUNT? CREATE ONE'}</button>
      </div>}
    </section>
  </div>
}
