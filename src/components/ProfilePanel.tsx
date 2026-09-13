import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfilePanel({ onClose }: { onClose: () => void }) {
  const [displayName, setDisplayName] = useState('Naija Player')
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [language, setLanguage] = useState('en')
  const [saved, setSaved] = useState(false)

  useEffect(() => { supabase.auth.getUser().then(async ({ data }) => { if (!data.user) return; const { data: profile } = await supabase.from('profiles').select('display_name,username,theme,preferred_language').eq('user_id', data.user.id).maybeSingle(); if (profile) { setDisplayName(profile.display_name); setUsername(profile.username || ''); setTheme(profile.theme || 'dark'); setLanguage(profile.preferred_language || 'en') } }) }, [])

  const save = async () => { const user = (await supabase.auth.getUser()).data.user; if (!user) return; const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() || 'Naija Player', username: username.trim().toLowerCase(), theme, preferred_language: language }).eq('user_id', user.id); if (!error) { setSaved(true); window.setTimeout(() => setSaved(false), 1800) } }

  return <div className="profile-overlay"><section className="profile-panel"><header className="profile-panel-head"><div><p className="eyebrow">PLAYER PROFILE</p><h2>Your TRIVIA 9JA identity.</h2></div><button onClick={onClose} className="auth-close">×</button></header><div className="profile-identity"><div className="large-avatar">{displayName.trim().charAt(0).toUpperCase() || '?'}</div><div><strong>@{username || 'player'}</strong><span>Naija knowledge seeker</span></div><button className="avatar-button">CHANGE PFP</button></div><div className="settings-grid"><label>DISPLAY NAME<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={24}/></label><label>USERNAME<input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={24}/></label><label>LANGUAGE<select value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="ha">Hausa</option><option value="yo">Yorùbá</option><option value="ig">Igbo</option></select></label><label>APPEARANCE<select value={theme} onChange={e => setTheme(e.target.value as typeof theme)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label></div><div className="profile-actions"><button className="secondary-action" onClick={onClose}>CANCEL</button><button className="primary-action" onClick={save}>{saved ? 'SAVED ✓' : 'SAVE CHANGES →'}</button></div></section></div>
}
