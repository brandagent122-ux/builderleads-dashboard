'use client'
import { useState, useEffect, useRef } from 'react'
import { getUserContext, getSession } from '@/lib/supabase'

function TypingText({ text, speed = 12, onComplete, box }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const doneRef = useRef(false)
  const [showCursor, setShowCursor] = useState(true)
  const sparkColors = ['#AFA9EC','#7F77DD','#534AB7','#9FE1CB','#5DCAA5','#CECBF6','#D4537E']

  function emitSparks(n, type) {
    if (!box?.current) return
    const cur = box.current.querySelector('.mw-cursor')
    if (!cur) return
    const cr = cur.getBoundingClientRect()
    const br = box.current.getBoundingClientRect()
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div')
      s.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;animation:${type==='burst'?'mwburst':'mwrise'} ${type==='burst'?'0.6':'1.2'}s ease-out forwards;`
      const sz = 2 + Math.random() * 5
      s.style.width = sz + 'px'; s.style.height = sz + 'px'
      s.style.background = sparkColors[Math.floor(Math.random() * sparkColors.length)]
      s.style.left = (cr.left - br.left + Math.random() * 8 - 4) + 'px'
      s.style.top = (cr.top - br.top + Math.random() * 8 - 4) + 'px'
      if (type === 'burst') { s.style.setProperty('--bx', (Math.random()*40-20)+'px'); s.style.setProperty('--by', (Math.random()*40-20)+'px') }
      box.current.appendChild(s)
      setTimeout(() => s.remove(), 1200)
    }
  }

  useEffect(() => {
    if (!text) return
    idxRef.current = 0; doneRef.current = false; setDisplayed('')
    const interval = setInterval(() => {
      const ch = text[idxRef.current]
      idxRef.current = Math.min(idxRef.current + (ch === ' ' ? 2 : 1), text.length)
      setDisplayed(text.substring(0, idxRef.current))
      if (Math.random() > 0.5) emitSparks(1, 'rise')
      if (ch === '.' || ch === '\n') emitSparks(4, 'burst')
      if (idxRef.current >= text.length) { clearInterval(interval); doneRef.current = true; setShowCursor(false); emitSparks(15, 'burst'); if (onComplete) setTimeout(onComplete, 300) }
    }, speed)
    const blink = setInterval(() => { if (!doneRef.current) setShowCursor(c => !c) }, 500)
    return () => { clearInterval(interval); clearInterval(blink) }
  }, [text])

  return <span>{displayed}{!doneRef.current && <span className="mw-cursor" style={{ display:'inline-block',width:2,height:16,background:'#7F77DD',verticalAlign:'text-bottom',marginLeft:1,opacity:showCursor?1:0,boxShadow:'0 0 8px rgba(127,119,221,0.6),0 0 16px rgba(127,119,221,0.3)' }}></span>}</span>
}

function AgentStep({ icon, name, status, time }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:12,
      border:`0.5px solid ${status==='active'?'#7F77DD':status==='done'?'#1D9E75':'var(--color-border-tertiary,rgba(255,255,255,0.08))'}`,
      background:'var(--color-background-primary,#212126)',position:'relative',overflow:'hidden',transition:'all 0.4s',
    }}>
      {status==='active' && <div style={{position:'absolute',inset:0,background:'rgba(127,119,221,0.06)'}}/>}
      {status==='done' && <div style={{position:'absolute',inset:0,background:'rgba(29,158,117,0.06)'}}/>}
      <div style={{
        width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',
        background:status==='active'?'rgba(127,119,221,0.12)':status==='done'?'rgba(29,158,117,0.12)':'var(--color-background-secondary,#19191D)',transition:'all 0.4s',
      }}>
        {status==='active' && <div style={{position:'absolute',inset:-3,borderRadius:'50%',border:'2px solid #7F77DD',borderTopColor:'transparent',animation:'mwspin 1.5s linear infinite'}}/>}
        {status==='done' && <div style={{position:'absolute',inset:-3,borderRadius:'50%',border:'2px solid #1D9E75'}}/>}
        {status==='done' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:'relative',zIndex:1,animation:'mwpop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards'}}><polyline points="20 6 9 17 4 12"/></svg>
        ) : <span style={{position:'relative',zIndex:1}} dangerouslySetInnerHTML={{__html:icon}}/>}
      </div>
      <div style={{position:'relative',zIndex:1}}>
        <div style={{fontSize:10,fontWeight:500,fontFamily:'var(--font-mono,monospace)',letterSpacing:0.3,color:status==='active'?'#7F77DD':status==='done'?'#1D9E75':'var(--color-text-tertiary,#555)',transition:'color 0.4s'}}>{name}</div>
        {status==='done' && time && <div style={{fontSize:9,color:'var(--color-text-tertiary,#555)',fontFamily:'var(--font-mono,monospace)',marginTop:1}}>{time}</div>}
      </div>
    </div>
  )
}

function Connector({ lit }) {
  return <div style={{width:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{width:16,height:1,background:lit?'#1D9E75':'var(--color-border-tertiary,rgba(255,255,255,0.08))',transition:'background 0.4s'}}/>
  </div>
}

function SubjectPicker({ subjects, selected, onSelect, compact = false }) {
  if (!subjects || subjects.length <= 1) return null
  return (
    <div style={{ display:'flex', flexDirection: compact ? 'column' : 'row', gap: compact ? 4 : 6, marginBottom: compact ? 8 : 12 }}>
      {subjects.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          style={{
            flex: compact ? undefined : 1, padding: compact ? '6px 10px' : '8px 12px', borderRadius: 8,
            border: `1px solid ${selected === s ? 'var(--ember,#FF7A3D)' : 'rgba(255,255,255,0.06)'}`,
            background: selected === s ? 'rgba(255,122,61,0.08)' : 'rgba(255,255,255,0.02)',
            color: selected === s ? 'var(--ember,#FF7A3D)' : 'var(--color-text-secondary,#aaa)',
            fontSize: compact ? 11 : 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
          }}>
          <span style={{ fontSize:9, fontFamily:'var(--font-mono,monospace)', opacity:0.5, marginRight:6 }}>#{i+1}</span>
          {s}
        </button>
      ))}
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy} className="text-xs font-semibold py-2 px-4 rounded-lg" style={{
      background: copied ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
      color: copied ? '#4ade80' : '#888',
      border: `1px solid ${copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.3s',
    }}>
      {copied ? 'Copied!' : label}
    </button>
  )
}

export default function OutreachPage() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [userCtx, setUserCtx] = useState(null)

  const [editBodies, setEditBodies] = useState({})
  const [editMode, setEditMode] = useState({})
  const [selectedSubjects, setSelectedSubjects] = useState({})
  const [draftSubjects, setDraftSubjects] = useState({})
  const [learnLoading, setLearnLoading] = useState({})

  const [generating, setGenerating] = useState(false)
  const [genAddress, setGenAddress] = useState('')
  const [agentStates, setAgentStates] = useState(['idle','idle','idle','idle'])
  const [agentTimes, setAgentTimes] = useState(['','','',''])
  const [connectors, setConnectors] = useState([false,false,false])
  const [genDraft, setGenDraft] = useState(null)
  const [typingPhase, setTypingPhase] = useState('')
  const [genStatus, setGenStatus] = useState('DRAFTING')
  const [genSelectedSubject, setGenSelectedSubject] = useState(null)
  const emailBoxRef = useRef(null)

  async function loadDrafts() {
    try {
      const session = await getSession()
      const token = session?.access_token || ''
      const resp = await fetch('/api/drafts', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (resp.ok) {
        const data = await resp.json()
        setDrafts(data.drafts || [])
        await loadDraftSubjects(data.drafts || [])
      }
    } catch (err) {
      console.log('[Outreach] loadDrafts error:', err.message)
    }
  }

  async function loadDraftSubjects(draftList) {
    if (!draftList || draftList.length === 0) return
    try {
      const session = await getSession()
      const draftIds = draftList.map(d => d.id)
      const resp = await fetch('/api/draft/subjects?' + new URLSearchParams({ ids: draftIds.join(',') }), {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.subjects) setDraftSubjects(prev => ({ ...prev, ...data.subjects }))
      }
    } catch {}
  }

  // Cache helpers
  function cacheDrafts(draftsArr) {
    try { sessionStorage.setItem('bl_drafts_cache', JSON.stringify(draftsArr)) } catch {}
  }
  function getCachedDrafts() {
    try { const c = sessionStorage.getItem('bl_drafts_cache'); return c ? JSON.parse(c) : [] } catch { return [] }
  }

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext()
      if (!ctx) { setLoading(false); return }
      setUserCtx(ctx)

      // Show cached drafts immediately (no flash of empty)
      const cached = getCachedDrafts()
      if (cached.length > 0) {
        setDrafts(cached)
        setLoading(false)
      }

      // Fetch fresh from API
      let freshData = null
      const session = await getSession()
      const token = session?.access_token || ''

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const s = attempt === 0 ? session : await getSession()
          const t = s?.access_token || token
          const resp = await fetch('/api/drafts', {
            headers: t ? { 'Authorization': `Bearer ${t}` } : {},
            credentials: 'include',
          })
          if (resp.ok) {
            const result = await resp.json()
            freshData = result.drafts || []
            break
          } else {
            console.log(`[Outreach] API ${resp.status} attempt ${attempt + 1}`)
          }
        } catch (err) {
          console.log(`[Outreach] Fetch error attempt ${attempt + 1}:`, err.message)
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 800))
      }

      // If API returned data, use it and update cache
      if (freshData !== null && freshData.length > 0) {
        setDrafts(freshData)
        cacheDrafts(freshData)
        if (freshData.length > 0) await loadDraftSubjects(freshData)
      } else if (freshData !== null && freshData.length === 0 && cached.length === 0) {
        // API returned empty AND no cache - genuinely no drafts
        setDrafts([])
      }
      // If API failed or returned empty but cache exists, keep showing cache

      // Check for pending draft request
      const raw = localStorage.getItem('bl_draft_request')
      if (raw) {
        localStorage.removeItem('bl_draft_request')
        try {
          const req = JSON.parse(raw)
          if (Date.now() - req.ts < 30000) {
            const allDrafts = freshData || cached
            const existingDraft = allDrafts.find(d => d.lead_id === req.lead_id)
            if (!existingDraft) {
              runDraftGeneration(req.lead_id, req.address)
            } else {
              setExpanded(existingDraft.id)
            }
          }
        } catch {}
      }

      setLoading(false)
    }
    setLoading(true)
    load()
  }, [])

  // Tab filtering is handled locally via filteredDrafts - no DB re-fetch needed

  async function runDraftGeneration(leadId, address) {
    setGenerating(true)
    setGenAddress(address)
    setGenDraft(null)
    setTypingPhase('')
    setGenStatus('DRAFTING')
    setGenSelectedSubject(null)
    setAgentStates(['idle','idle','idle','idle'])
    setAgentTimes(['','','',''])
    setConnectors([false,false,false])

    const t0 = Date.now()
    setAgentStates(['active','idle','idle','idle'])
    await sleep(800)
    setAgentStates(['done','idle','idle','idle'])
    setAgentTimes([fmt(t0),'','',''])
    setConnectors([true,false,false])

    setAgentStates(['done','active','idle','idle'])
    await sleep(600)
    setAgentStates(['done','done','idle','idle'])
    setAgentTimes(p => [p[0],fmt(t0),'',''])
    setConnectors([true,true,false])

    setAgentStates(['done','done','active','idle'])
    let result
    try {
      const session = await getSession()
      const resp = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ lead_id: leadId }),
      })
      result = await resp.json()
    } catch (err) {
      setGenStatus('ERROR'); return
    }
    if (result.error) { setGenStatus('ERROR'); return }

    setAgentStates(['done','done','done','idle'])
    setAgentTimes(p => [p[0],p[1],fmt(t0),''])
    setConnectors([true,true,true])

    setAgentStates(['done','done','done','active'])
    await sleep(500)
    setAgentStates(['done','done','done','done'])
    setAgentTimes(p => [p[0],p[1],p[2],fmt(t0)])

    setGenDraft(result.draft)
    setGenSelectedSubject(result.draft.subjects?.[0] || 'Outreach')
    setTypingPhase('subject')
  }

  // ─── Call learn API then update state locally (no re-fetch) ───
  async function callLearn(draftId, action, extras = {}) {
    setLearnLoading(prev => ({ ...prev, [draftId]: true }))
    try {
      const session = await getSession()
      const resp = await fetch('/api/draft/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        credentials: 'include',
        body: JSON.stringify({ draft_id: draftId, action, ...extras }),
      })
      const data = await resp.json()
      if (data.success) {
        const newStatus = action === 'approve' ? 'approved' : action === 'edit_approve' ? 'approved' : action === 'reject' ? 'rejected' : null
        if (newStatus) {
          setDrafts(prev => {
            const updated = prev.map(d => {
              if (d.id !== draftId) return d
              return { ...d, status: newStatus, body: extras.edited_body || d.body, subject: extras.selected_subject || d.subject }
            })
            cacheDrafts(updated)
            return updated
          })
        }
      }
      return data
    } catch (err) {
      console.error('Learn error:', err)
    } finally {
      setLearnLoading(prev => ({ ...prev, [draftId]: false }))
    }
  }

  async function handleApproveNew() {
    if (!genDraft) return
    await callLearn(genDraft.id, 'approve', { selected_subject: genSelectedSubject, all_subjects: genDraft.subjects })
    const newDraft = {
      id: genDraft.id, lead_id: genDraft.lead_id, subject: genSelectedSubject || genDraft.subjects?.[0] || 'Outreach',
      body: genDraft.body, status: 'approved', address: genAddress, score: 0, created_at: new Date().toISOString(),
    }
    setDrafts(prev => { const updated = [newDraft, ...prev.filter(d => d.id !== genDraft.id)]; cacheDrafts(updated); return updated })
    setGenerating(false)
  }

  async function handleEditApproveNew() {
    if (!genDraft) return
    const editedBody = editBodies[`gen_${genDraft.id}`] || genDraft.body
    await callLearn(genDraft.id, 'edit_approve', { edited_body: editedBody, selected_subject: genSelectedSubject, all_subjects: genDraft.subjects })
    const newDraft = {
      id: genDraft.id, lead_id: genDraft.lead_id, subject: genSelectedSubject || genDraft.subjects?.[0] || 'Outreach',
      body: editedBody, status: 'approved', address: genAddress, score: 0, created_at: new Date().toISOString(),
    }
    setDrafts(prev => { const updated = [newDraft, ...prev.filter(d => d.id !== genDraft.id)]; cacheDrafts(updated); return updated })
    setGenerating(false)
  }

  async function handleApprove(draftId) {
    await callLearn(draftId, 'approve', { selected_subject: selectedSubjects[draftId], all_subjects: draftSubjects[draftId] })
    setEditMode(prev => ({ ...prev, [draftId]: false }))
  }

  async function handleEditApprove(draftId) {
    const editedBody = editBodies[draftId]
    if (!editedBody) return
    await callLearn(draftId, 'edit_approve', { edited_body: editedBody, selected_subject: selectedSubjects[draftId], all_subjects: draftSubjects[draftId] })
    setEditMode(prev => ({ ...prev, [draftId]: false }))
  }

  async function handleReject(draftId) {
    await callLearn(draftId, 'reject')
  }

  async function handleMarkSent(draftId) {
    setLearnLoading(prev => ({ ...prev, [draftId]: true }))
    try {
      const session = await getSession()
      await fetch('/api/draft/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        credentials: 'include',
        body: JSON.stringify({ draft_id: draftId, action: 'mark_sent' }),
      })
      setDrafts(prev => { const updated = prev.map(d => d.id === draftId ? { ...d, status: 'sent' } : d); cacheDrafts(updated); return updated })
    } catch {} finally {
      setLearnLoading(prev => ({ ...prev, [draftId]: false }))
    }
  }

  function toggleEdit(draftId, currentBody) {
    setEditMode(prev => {
      const isEditing = !prev[draftId]
      if (isEditing && !editBodies[draftId]) {
        setEditBodies(p => ({ ...p, [draftId]: currentBody }))
      }
      return { ...prev, [draftId]: isEditing }
    })
  }

  function fmt(t0) { return ((Date.now()-t0)/1000).toFixed(1)+'s' }

  // Filter drafts for display based on current tab
  const filteredDrafts = filter === 'all' ? drafts : drafts.filter(d => d.status === filter)

  const counts = {
    all: drafts.length + (generating ? 1 : 0),
    pending_review: drafts.filter(d => d.status === 'pending_review').length + (generating && typingPhase === 'done' ? 1 : 0),
    approved: drafts.filter(d => d.status === 'approved').length,
    sent: drafts.filter(d => d.status === 'sent').length,
  }

  const mkIcon = (path, state) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${state==='active'?'#7F77DD':'var(--color-text-tertiary,#555)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`

  return (
    <div className="p-8">
      <style>{`
        @keyframes mwrise { 0%{opacity:0.9;transform:scale(1) translateY(0)} 100%{opacity:0;transform:scale(0.2) translateY(-35px)} }
        @keyframes mwburst { 0%{opacity:0.8;transform:scale(1) translate(0,0)} 100%{opacity:0;transform:scale(0) translate(var(--bx),var(--by))} }
        @keyframes mwspin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes mwpop { 0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review, edit, and approve outreach drafts</p>
        </div>
        <div className="text-sm text-slate-500">{counts.all} emails</div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'pending_review', 'approved', 'sent'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? 'active' : ''}`}>
            {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f === 'approved' ? 'Approved' : 'Sent'}
            <span className="text-[10px] ml-1 opacity-50">({counts[f] || 0})</span>
          </button>
        ))}
      </div>

      {/* Generation card */}
      {generating && (
        <div className="card p-6 mb-4" style={{ borderLeft: '3px solid #7F77DD' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: genStatus==='COMPLETE'?'#1D9E75':'#7F77DD', transition:'background 0.4s' }} />
            <span style={{ fontSize:10, fontFamily:'var(--font-mono,monospace)', letterSpacing:1.5, color: genStatus==='COMPLETE'?'#1D9E75':'#7F77DD', fontWeight:500 }}>{genStatus}</span>
            <span style={{ fontSize:14, fontWeight:500, color:'var(--color-text-primary,#fff)' }}>{genAddress}</span>
          </div>

          <div style={{ display:'flex', gap:0, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
            <AgentStep icon={mkIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',agentStates[0])} name="Analyze" status={agentStates[0]} time={agentTimes[0]} />
            <Connector lit={connectors[0]} />
            <AgentStep icon={mkIcon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',agentStates[1])} name="Angle" status={agentStates[1]} time={agentTimes[1]} />
            <Connector lit={connectors[1]} />
            <AgentStep icon={mkIcon('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>',agentStates[2])} name="Write" status={agentStates[2]} time={agentTimes[2]} />
            <Connector lit={connectors[2]} />
            <AgentStep icon={mkIcon('<path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',agentStates[3])} name="Verify" status={agentStates[3]} time={agentTimes[3]} />
          </div>

          {genDraft && (
            <div ref={emailBoxRef} style={{
              borderRadius:12, border:'0.5px solid var(--color-border-tertiary,rgba(255,255,255,0.08))',
              background:'var(--color-background-secondary,#19191D)', padding:'1.25rem', position:'relative', overflow:'hidden', minHeight:160,
            }}>
              <div style={{ position:'absolute', bottom:0, left:0, height:1, width:typingPhase==='done'?'100%':'0%', background:'linear-gradient(90deg,transparent,rgba(127,119,221,0.4),rgba(93,202,165,0.3),transparent)', transition:'width 3s ease' }} />

              {typingPhase === 'done' && genDraft.subjects?.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize:9, fontFamily:'var(--font-mono,monospace)', color:'var(--color-text-tertiary,#555)', marginBottom:6, letterSpacing:0.5 }}>SUBJECT LINE</div>
                  <SubjectPicker subjects={genDraft.subjects} selected={genSelectedSubject} onSelect={setGenSelectedSubject} />
                </div>
              )}

              <div style={{ fontSize:15, fontWeight:500, color:'var(--color-text-primary,#fff)', marginBottom:16, minHeight:22 }}>
                {typingPhase === 'subject' ? (
                  <TypingText text={genDraft.subjects?.[0] || 'Outreach'} speed={25} box={emailBoxRef} onComplete={() => setTypingPhase('body')} />
                ) : (typingPhase === 'body' || typingPhase === 'done') ? (genSelectedSubject || genDraft.subjects?.[0] || 'Outreach') : null}
              </div>

              <div style={{ fontSize:13, lineHeight:1.8, color:'var(--color-text-secondary,#aaa)' }}>
                {typingPhase === 'body' ? (
                  <TypingText text={genDraft.body} speed={12} box={emailBoxRef} onComplete={() => {
                    setTypingPhase('done')
                    setGenStatus('COMPLETE')
                    // Add to drafts list so it shows in tabs
                    setDrafts(prev => {
                      if (prev.find(d => d.id === genDraft.id)) return prev
                      return [{ id: genDraft.id, lead_id: genDraft.lead_id, subject: genDraft.subjects?.[0] || 'Outreach', body: genDraft.body, status: 'pending_review', address: genAddress, score: 0, created_at: new Date().toISOString() }, ...prev]
                    })
                  }} />
                ) : typingPhase === 'done' ? (
                  editMode[`gen_${genDraft.id}`] ? (
                    <textarea
                      value={editBodies[`gen_${genDraft.id}`] || genDraft.body}
                      onChange={e => setEditBodies(prev => ({ ...prev, [`gen_${genDraft.id}`]: e.target.value }))}
                      style={{ width:'100%', minHeight:200, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,122,61,0.2)', borderRadius:8, padding:12, color:'var(--color-text-secondary,#aaa)', fontSize:13, lineHeight:1.8, fontFamily:'inherit', resize:'vertical', outline:'none' }}
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: genDraft.body.replace(/\n/g, '<br>') }} />
                  )
                ) : null}
              </div>

              {typingPhase === 'done' && (
                <div style={{ display:'flex', gap:8, marginTop:16, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.04)', flexWrap:'wrap' }}>
                  {!editMode[`gen_${genDraft.id}`] ? (
                    <>
                      <button onClick={handleApproveNew} style={{ fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'rgba(74,222,128,0.1)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.15)', cursor:'pointer' }}>Approve</button>
                      <button onClick={() => { setEditBodies(prev => ({ ...prev, [`gen_${genDraft.id}`]: genDraft.body })); setEditMode(prev => ({ ...prev, [`gen_${genDraft.id}`]: true })) }}
                        style={{ fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'rgba(255,122,61,0.08)', color:'var(--ember,#FF7A3D)', border:'1px solid rgba(255,122,61,0.15)', cursor:'pointer' }}>Edit</button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleEditApproveNew} style={{ fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'rgba(74,222,128,0.1)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.15)', cursor:'pointer' }}>Save & Approve</button>
                      <button onClick={() => setEditMode(prev => ({ ...prev, [`gen_${genDraft.id}`]: false }))} style={{ fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:10, background:'rgba(255,255,255,0.04)', color:'#888', border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer' }}>Cancel edit</button>
                    </>
                  )}
                  <CopyButton text={editBodies[`gen_${genDraft.id}`] || genDraft.body} />
                </div>
              )}
            </div>
          )}

          {genStatus === 'ERROR' && (
            <div style={{ color:'#f87171', fontSize:12, marginTop:8 }}>Failed to generate draft. Check your Anthropic API credits.</div>
          )}
        </div>
      )}

      {/* Draft list */}
      {loading && !generating ? (
        <div className="text-center py-20 text-accent animate-pulse text-sm">Loading drafts...</div>
      ) : filteredDrafts.length === 0 && !generating ? (
        <div className="text-center py-20 text-slate-650">No drafts match this filter</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredDrafts.map(draft => {
            const isExpanded = expanded === draft.id
            const isEditing = editMode[draft.id]
            const isLoading = learnLoading[draft.id]
            const subjects = draftSubjects[draft.id] || []
            const currentSubject = selectedSubjects[draft.id] || draft.subject
            return (
              <div key={draft.id} className="card p-5" style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-white">{draft.address}</span>
                      {draft.score > 0 && <span className="text-xs font-bold font-mono" style={{ color: draft.score >= 75 ? '#ff6b35' : '#fbbf24' }}>{draft.score}</span>}
                      <StatusBadge status={draft.status} />
                    </div>
                    <div className="text-sm text-accent-light font-medium">{currentSubject}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpanded(isExpanded ? null : draft.id)} className="btn-secondary text-xs py-1.5 px-3">
                      {isExpanded ? 'Collapse' : 'Preview'}
                    </button>
                  </div>
                </div>
                {!isExpanded && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{draft.body?.substring(0, 150)}...</p>}
                {isExpanded && (
                  <div className="mt-4">
                    {subjects.length > 1 && draft.status === 'pending_review' && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:9, fontFamily:'var(--font-mono,monospace)', color:'var(--color-text-tertiary,#555)', marginBottom:6, letterSpacing:0.5 }}>CHOOSE SUBJECT LINE</div>
                        <SubjectPicker subjects={subjects} selected={currentSubject} onSelect={s => setSelectedSubjects(prev => ({ ...prev, [draft.id]: s }))} compact />
                      </div>
                    )}

                    {isEditing ? (
                      <textarea
                        value={editBodies[draft.id] || draft.body}
                        onChange={e => setEditBodies(prev => ({ ...prev, [draft.id]: e.target.value }))}
                        style={{ width:'100%', minHeight:200, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,122,61,0.2)', borderRadius:8, padding:12, color:'var(--color-text-secondary,#aaa)', fontSize:13, lineHeight:1.8, fontFamily:'inherit', resize:'vertical', outline:'none', marginBottom:12 }}
                      />
                    ) : (
                      <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap rounded-lg p-4 mb-3" style={{ background:'var(--card-sunk,#19191D)', border:'1px solid rgba(255,255,255,0.04)' }}>
                        {draft.body}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {draft.status === 'pending_review' && !isEditing && (
                        <>
                          <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'#4ade8015', color:'#4ade80', border:'1px solid #4ade8020' }} onClick={() => handleApprove(draft.id)} disabled={isLoading}>Approve</button>
                          <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'rgba(255,122,61,0.08)', color:'var(--ember,#FF7A3D)', border:'1px solid rgba(255,122,61,0.15)' }} onClick={() => toggleEdit(draft.id, draft.body)}>Edit</button>
                          <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'rgba(248,113,113,0.08)', color:'#f87171', border:'1px solid rgba(248,113,113,0.15)' }} onClick={() => handleReject(draft.id)} disabled={isLoading}>Reject</button>
                        </>
                      )}
                      {draft.status === 'pending_review' && isEditing && (
                        <>
                          <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'#4ade8015', color:'#4ade80', border:'1px solid #4ade8020' }} onClick={() => handleEditApprove(draft.id)} disabled={isLoading}>Save & Approve</button>
                          <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'rgba(255,255,255,0.04)', color:'#888', border:'1px solid rgba(255,255,255,0.06)' }} onClick={() => toggleEdit(draft.id, draft.body)}>Cancel edit</button>
                        </>
                      )}
                      {draft.status === 'approved' && (
                        <button className="text-xs font-semibold py-2 px-4 rounded-lg" style={{ background:'#3b82f615', color:'#60a5fa', border:'1px solid #3b82f620' }} onClick={() => handleMarkSent(draft.id)} disabled={isLoading}>Mark as sent</button>
                      )}
                      <CopyButton text={editBodies[draft.id] || draft.body} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function StatusBadge({ status }) {
  const styles = { pending_review: 'bg-amber-500/15 text-amber-400', approved: 'bg-green-500/15 text-green-400', sent: 'bg-blue-500/15 text-blue-400', rejected: 'bg-red-500/15 text-red-400' }
  const labels = { pending_review: 'Pending', approved: 'Approved', sent: 'Sent', rejected: 'Rejected' }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] || ''}`}>{labels[status] || status}</span>
}
