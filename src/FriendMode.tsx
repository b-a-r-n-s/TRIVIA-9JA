import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Language = 'en' | 'ha' | 'yo' | 'ig'
type FriendQuestion = { id:string; prompt:string; options:string[]; question_type:'multiple_choice'|'riddle'|'scramble'; metadata?:Record<string,unknown> }
type Challenge = { id:string; invite_code?:string; language:Language; duration_seconds:number; status:string; started_at?:string; expires_at?:string; opponent_id?:string|null }

async function call<T>(name:string, body:Record<string,unknown>):Promise<T>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session) throw new Error('Please sign in to play.')
  const {data,error}=await supabase.functions.invoke(name,{body,headers:{Authorization:`Bearer ${session.access_token}`}})
  if(error) throw error
  return data as T
}

export default function FriendMode({language,onBack}:{language:Language;onBack:()=>void}){
  const [view,setView]=useState<'menu'|'waiting'|'game'|'result'>('menu')
  const [challenge,setChallenge]=useState<Challenge|null>(null)
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [question,setQuestion]=useState<FriendQuestion|null>(null)
  const [position,setPosition]=useState(1)
  const [score,setScore]=useState(0)
  const [otherScore,setOtherScore]=useState(0)
  const [remaining,setRemaining]=useState(90)
  const [selected,setSelected]=useState<string|null>(null)
  const [correct,setCorrect]=useState<boolean|null>(null)
  const [winner,setWinner]=useState<string|null>(null)

  const reset=()=>{setChallenge(null);setQuestion(null);setPosition(1);setScore(0);setOtherScore(0);setRemaining(90);setSelected(null);setCorrect(null);setWinner(null);setError('');setView('menu')}

  const startGame=async(c:Challenge)=>{
    setBusy(true);setError('')
    try{
      const data=await call<{challenge:Challenge}>('start_friend_challenge',{challenge_id:c.id})
      setChallenge(data.challenge);setRemaining(data.challenge.duration_seconds);setPosition(1);setView('game')
      await loadQuestion(data.challenge.id,1)
    }catch(e){setError(e instanceof Error?e.message:'Could not start challenge.')}finally{setBusy(false)}
  }

  const loadQuestion=async(id:string,pos:number)=>{
    try{
      const data=await call<{question:FriendQuestion;position:number;expires_at:string}>('get_friend_question',{challenge_id:id,position:pos})
      setQuestion(data.question);setPosition(data.position);setSelected(null);setCorrect(null)
    }catch(e){
      const message=e instanceof Error?e.message:'Could not load question.'
      if(/no more|expired/i.test(message)) finish(id); else setError(message)
    }
  }

  const create=async()=>{
    setBusy(true);setError('')
    try{const data=await call<{challenge:Challenge}>('create_friend_challenge',{language,duration_seconds:90});setChallenge(data.challenge);setCode(data.challenge.invite_code||'');setView('waiting')}
    catch(e){setError(e instanceof Error?e.message:'Could not create challenge.')}finally{setBusy(false)}
  }

  const join=async()=>{
    if(code.trim().length<6)return setError('Enter a valid challenge code.')
    setBusy(true);setError('')
    try{const data=await call<{challenge:Challenge}>('join_friend_challenge',{invite_code:code.trim()});setChallenge(data.challenge);await startGame(data.challenge)}
    catch(e){setError(e instanceof Error?e.message:'Could not join challenge.')}finally{setBusy(false)}
  }

  const findRival=async()=>{
    setBusy(true);setError('')
    try{const data=await call<{status:'waiting'|'matched';queue_id?:string;challenge?:Challenge}>('find_rival',{language});if(data.status==='matched'&&data.challenge){setChallenge(data.challenge);await startGame(data.challenge)}else setView('waiting')}
    catch(e){setError(e instanceof Error?e.message:'Could not find a rival.')}finally{setBusy(false)}
  }

  const finish=async(id:string)=>{
    try{const data=await call<{creator_score:number;opponent_score:number;winner_id:string|null}>('finish_friend_challenge',{challenge_id:id});setScore(data.creator_score);setOtherScore(data.opponent_score);setWinner(data.winner_id);setQuestion(null);setView('result')}
    catch(e){setError(e instanceof Error?e.message:'Could not finish challenge.')}
  }

  const answer=async(option:string)=>{
    if(!challenge||!question||selected)return
    setSelected(option);setBusy(true);setError('')
    try{const data=await call<{correct:boolean;score:number;duplicate:boolean}>('submit_friend_answer',{challenge_id:challenge.id,position,answer:option});setCorrect(data.correct);setScore(data.score);window.setTimeout(()=>loadQuestion(challenge.id,position+1),data.correct?450:750)}
    catch(e){setSelected(null);setError(e instanceof Error?e.message:'Answer could not be submitted.')}finally{setBusy(false)}
  }

  useEffect(()=>{
    if(view!=='game'||!challenge?.expires_at)return
    const tick=()=>{const left=Math.max(0,Math.ceil((Date.parse(challenge.expires_at!)-Date.now())/1000));setRemaining(left);if(left===0)finish(challenge.id)}
    tick();const t=window.setInterval(tick,250);return()=>window.clearInterval(t)
  },[view,challenge?.expires_at,challenge?.id])

  useEffect(()=>{
    if(view!=='waiting'||!challenge)return
    const poll=async()=>{try{const {data}=await supabase.from('friend_challenges').select('id,creator_id,opponent_id,language,duration_seconds,status,started_at,expires_at').eq('id',challenge.id).maybeSingle();if(data?.status==='ready'&&data.opponent_id)startGame(data as Challenge)}catch{}}
    const t=window.setInterval(poll,1200);poll();return()=>window.clearInterval(t)
  },[view,challenge?.id])

  const share=async()=>{if(!challenge?.invite_code)return;const url=`${window.location.origin}${window.location.pathname}?challenge=${challenge.invite_code}`;try{if(navigator.share)await navigator.share({title:'TRIVIA 9JA challenge',text:`Challenge me on TRIVIA 9JA: ${challenge.invite_code}`,url});else await navigator.clipboard.writeText(url)}catch{}}

  if(view==='game'&&challenge)return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={onBack}>←</button><div><p className="eyebrow">FRIEND CHALLENGE</p><h1>{remaining}s left</h1></div><span className="coin-pill">{score} — {otherScore}</span></header><div className="game-progress"><span style={{width:`${(remaining/challenge.duration_seconds)*100}%`}}/></div>{error&&<p className="auth-message">{error}</p>}{question?<section className="question-stage"><div className="question-meta"><span>QUESTION {position}</span><span>90 SEC</span></div><div className="question-card"><span className="question-type">{question.question_type==='riddle'?'BRAIN TEASER':question.question_type==='scramble'?'LETTER SCRAMBLE':'FRIEND DUEL'}</span><h1>{question.prompt}</h1></div><div className="answers">{question.options.map((o,i)=><button disabled={Boolean(selected)||busy} className={`answer ${selected===o?(correct?'correct':'wrong'):''}`} key={o} onClick={()=>answer(o)}><span>{String.fromCharCode(65+i)}</span>{o}</button>)}</div></section>:<p className="auth-message">Loading next question…</p>}</main>

  if(view==='result')return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={reset}>←</button><div><p className="eyebrow">FRIEND CHALLENGE</p><h1>Challenge complete.</h1></div></header><section className="question-card" style={{textAlign:'center'}}><p className="section-label">FINAL SCORE</p><h1 style={{fontSize:58,margin:'12px 0'}}>{score} — {otherScore}</h1><p>{winner?'Winner decided.':'It’s a draw.'}</p><button className="primary-action" onClick={reset}>PLAY AGAIN <span className="arrow">→</span></button></section></main>

  return <main className="app-shell inner-screen"><header className="inner-header"><button onClick={onBack}>←</button><div><p className="eyebrow">FRIEND MODE</p><h1>Make it personal.</h1></div></header>{error&&<p className="auth-message">{error}</p>}<section className="modes" style={{display:'grid',gap:14}}><article className="mode-card solo-card"><div className="mode-topline"><span>01</span><span>CHALLENGE A FRIEND</span></div><div className="mode-copy"><h2>Settle it<br/>properly.</h2><p>Create a private 90-second challenge and send the code to your rival.</p>{challenge?.invite_code&&<div className="question-card" style={{textAlign:'center',margin:'14px 0'}}><p className="section-label">YOUR CODE</p><h2 style={{letterSpacing:5}}>{challenge.invite_code}</h2><button className="secondary-action" onClick={share}>SHARE CHALLENGE</button></div>}<button className="primary-action" disabled={busy} onClick={create}>{busy?'CREATING…':'CREATE CHALLENGE'} <span className="arrow">→</span></button></div></article><article className="mode-card community-card"><div className="mode-topline"><span>02</span><span>JOIN A FRIEND</span></div><div className="mode-copy"><h2>Got a code?</h2><p>Enter the challenge code your friend sent you.</p><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="10-CHARACTER CODE" maxLength={10} style={{width:'100%',padding:16,margin:'10px 0 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.14)',background:'rgba(0,0,0,.2)',color:'inherit',fontSize:18,letterSpacing:3}}/><button className="secondary-action" disabled={busy} onClick={join}>JOIN CHALLENGE <span className="arrow">→</span></button></div></article><article className="mode-card solo-card"><div className="mode-topline"><span>03</span><span>FIND A RIVAL</span></div><div className="mode-copy"><h2>Random opponent.<br/>Same pressure.</h2><p>We’ll match you with someone waiting in the same language.</p><button className="primary-action" disabled={busy} onClick={findRival}>{busy?'SEARCHING…':'FIND A RIVAL'} <span className="arrow">→</span></button></div></article></section>{view==='waiting'&&<div className="auth-backdrop"><section className="auth-card"><p className="eyebrow">MATCHMAKING</p><h2>{challenge?.invite_code?'Waiting for your friend.':'Finding your rival.'}</h2><p className="auth-subtitle">{challenge?.invite_code?`Share code ${challenge.invite_code}. The challenge starts when they join.`:'Stay here. We are checking for a match.'}</p>{challenge?.invite_code&&<button className="secondary-action" onClick={share}>SHARE CODE</button>}<button className="secondary-action" onClick={reset}>CANCEL</button></section></div>}</main>
}
