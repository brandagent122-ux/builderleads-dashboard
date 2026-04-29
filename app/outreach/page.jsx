'use client'
import { useState, useEffect, useRef } from 'react'
import { getDrafts, updateDraftStatus, getUserContext, getActiveMarket, getSession } from '@/lib/supabase'

// Typing animation component
function TypingText({ text, speed = 15, onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const idxRef = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!text) return
    idxRef.current = 0
    doneRef.current = false
    setDisplayed('')

    const interval = setInterval(() => {
      // Type 1-3 chars at a time for natural feel
      const jump = text[idxRef.current] === ' ' ? 2 : 1
      idxRef.current = Math.min(idxRef.current + jump, text.length)
      setDisplayed(text.substring(0, idxRef.current))

      if (idxRef.current >= text.length) {
        clearInterval(interval)
        doneRef.current = true
        setShowCursor(false)
        if (onComplete) setTimeout(onComplete, 300)
      }
    }, speed)

    const blink = setInterval(() => {
      if (!doneRef.current) setShowCursor(c => !c)
    }, 500)

    return () => { clearInterval(interval); clearInterval(blink) }
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!doneRef.current && <span style={{ color: '#FF7A3D', fontWeight: 700, opacity: showCursor ? 1 : 0 }}>|</span>}
    </span>
  )
}

export default function OutreachPage() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [assignedIds, setAssignedIds] = useState(null)
  const [marketVersion, setMarketVersion] = useState(0)

  // Draft generation state
  const [generating, setGenerating] = useState(false)
  const [genAddress, setGenAddress] = useState('')
  const [genPhase, setGenPhase] = useState('') // profiling, selecting, writing, compliance
  const [genDraft, setGenDraft] = useState(null) // completed draft data
  const [typingStage, setTypingStage] = useState('') // subject, body, done
  const genCardRef = useRef(null)

  const PHASES = [
    { key: 'profiling', label: 'Analyzing lead data...', icon: '1' },
    { key: 'selecting', label: 'Selecting outreach angle...', icon: '2' },
    { key: 'writing', label: 'Writing draft...', icon: '3' },
    { key: 'compliance', label: 'Compliance check...', icon: '4' },
  ]

  // Check for pending draft request on mount
  useEffect(() => {
    const raw = localStorage.getItem('bl_draft_request')
    if (raw) {
      localStorage.removeItem('bl_draft_request')
      try {
        const req = JSON.parse(raw)
        if (Date.now() - req.ts < 30000) {
          generateDraft(req.lead_id, req.address)
        }
      } catch {}
    }
  }, [])

  async function generateDraft(leadId, address) {
    setGenerating(true)
    setGenAddress(address)
    setGenDraft(null)
    setTypingStage('')

    // Animate through phases
    setGenPhase('profiling')
    await sleep(800)
    setGenPhase('selecting')
    await sleep(600)
    setGenPhase('writing')

    try {
      const session = await getSession()
      const resp = await fetch('/api/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      })
      const result = await resp.json()

      setGenPhase('compliance')
      await sleep(500)

      if (result.error) {
        setGenerating(false)
        setGenPhase('')
        alert('Draft error: ' + result.error)
        return
      }

      // Draft ready, start typing animation
      setGenDraft(result.draft)
      setGenPhase('')
      setTypingStage('subject')

      // Reload drafts list to include the new one
      await reloadDrafts()
      setExpanded(result.draft.id)

    } catch (err) {
      setGenerating(false)
      setGenPhase('')
      alert('Draft error: ' + err.message)
    }
  }

  async function reloadDrafts() {
    const ctx = await getUserContext()
    if (!ctx) return
    const ids = ctx.assignedLeadIds
    const market = ctx.isAdmin ? getActiveMarket() : null
    setAssignedIds(ids)
    const data = await getDrafts(filter === 'all' ? null : filter, ids, market)
    setDrafts(data)
  }

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext()
      if (!ctx) { setLoading(false); return }
      const ids = ctx.assignedLeadIds
      const market = ctx.isAdmin ? getActiveMarket() : null
      setAssignedIds(ids)
      const data = await getDrafts(filter === 'all' ? null : filter, ids, market)
      setDrafts(data)
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [filter, marketVersion])

  useEffect(() => {
    const onMarketChange = () => { setLoading(true); setDrafts([]); setFilter('all'); setMarketVersion(v => v + 1) }
    window.addEventListener('market-changed', onMarketChange)
    return () => window.removeEventListener('market-changed', onMarketChange)
  }, [])

  async function handleStatusUpdate(id, status) {
    await updateDraftStatus(id, status)
    await reloadDrafts()
  }

  const counts = {
    all: drafts.length,
    pending_review: drafts.filter(d => d.status === 'pending_review').length,
    approved: drafts.filter(d => d.status === 'approved').length,
    sent: drafts.filter(d => d.status === 'sent').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review, approve, and track outreach drafts</p>
        </div>
        <div className="text-sm text-slate-500">{drafts.length} emails</div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'pending_review', 'approved', 'sent'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`tab ${filter === f ? 'active' : ''}`}>
            {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f === 'approved' ? 'Approved' : 'Sent'}
            <span className="text-[10px] ml-1 opacity-50">({counts[f] || 0})</span>
          </button>
        ))}
      </div>

      {/* Generating card - shows at top while Claude is writing */}
      {generating && !genDraft && (
        <div ref={genCardRef} className="card p-6 mb-4" style={{ borderLeft: '3px solid #FF7A3D' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF7A3D', animation: 'pulse 1.5s infinite' }} />
            <span className="font-mono text-[10px] tracking-wider" style={{ color: '#FF7A3D' }}>AI DRAFTING</span>
            <span className="text-sm text-white font-medium">{genAddress}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PHASES.map(phase => {
              const phaseIdx = PHASES.findIndex(p => p.key === phase.key)
              const currentIdx = PHASES.findIndex(p => p.key === genPhase)
              const isDone = phaseIdx < currentIdx
              const isActive = phase.key === genPhase
              const isPending = phaseIdx > currentIdx

              return (
                <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isPending ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                    background: isDone ? '#4ade8020' : isActive ? '#FF7A3D20' : '#19191D',
                    color: isDone ? '#4ade80' : isActive ? '#FF7A3D' : '#555',
                    border: `1px solid ${isDone ? '#4ade8030' : isActive ? '#FF7A3D30' : '#2a2a2e'}`,
                  }}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : phase.icon}
                  </div>
                  <span style={{ fontSize: 12, color: isDone ? '#4ade80' : isActive ? '#f0f0f0' : '#555', fontFamily: 'Inter, sans-serif' }}>
                    {phase.label}
                    {isActive && <span style={{ animation: 'blink 1s infinite' }}> ...</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Draft just completed - typing animation */}
      {genDraft && typingStage !== 'done' && (
        <div className="card p-6 mb-4" style={{ borderLeft: '3px solid #FF7A3D' }}>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
            <span className="font-mono text-[10px] tracking-wider" style={{ color: '#4ade80' }}>DRAFT READY</span>
            <span className="text-sm text-white font-medium">{genAddress}</span>
          </div>

          <div className="text-sm font-medium mb-3" style={{ color: '#FF7A3D' }}>
            {typingStage === 'subject' ? (
              <TypingText text={genDraft.subjects?.[0] || genDraft.body?.split('\n')[0] || ''} speed={25} onComplete={() => setTypingStage('body')} />
            ) : (
              genDraft.subjects?.[0] || ''
            )}
          </div>

          {typingStage === 'body' && (
            <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap rounded-lg p-4"
              style={{ background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <TypingText text={genDraft.body} speed={12} onComplete={() => {
                setTypingStage('done')
                setGenerating(false)
              }} />
            </div>
          )}
        </div>
      )}

      {/* Normal draft list */}
      {loading ? (
        <div className="text-center py-20 text-accent animate-pulse text-sm">Loading drafts...</div>
      ) : drafts.length === 0 && !generating ? (
        <div className="text-center py-20 text-slate-650">No drafts match this filter</div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map(draft => {
            const isExpanded = expanded === draft.id
            return (
              <div key={draft.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-white">{draft.address}</span>
                      <span className="text-xs font-bold font-mono" style={{ color: draft.score >= 75 ? '#ff6b35' : '#fbbf24' }}>
                        {draft.score}
                      </span>
                      <StatusBadge status={draft.status} />
                    </div>
                    <div className="text-sm text-accent-light font-medium">{draft.subject}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpanded(isExpanded ? null : draft.id)}
                      className="btn-secondary text-xs py-1.5 px-3">
                      {isExpanded ? 'Collapse' : 'Preview'}
                    </button>
                    {draft.status === 'pending_review' && (
                      <button className="btn-primary text-xs py-1.5 px-3" onClick={() => handleStatusUpdate(draft.id, 'approved')}>
                        Approve
                      </button>
                    )}
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{draft.body?.substring(0, 150)}...</p>
                )}

                {isExpanded && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap rounded-lg p-4 mb-3"
                      style={{ background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {draft.body}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {draft.status === 'pending_review' && (
                        <button className="text-xs font-semibold py-2 px-4 rounded-lg"
                          style={{ background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8020' }}
                          onClick={() => handleStatusUpdate(draft.id, 'approved')}>Approve</button>
                      )}
                      {draft.status === 'approved' && (
                        <button className="text-xs font-semibold py-2 px-4 rounded-lg"
                          style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f620' }}
                          onClick={() => handleStatusUpdate(draft.id, 'sent')}>Mark as sent</button>
                      )}
                      <button className="text-xs font-semibold py-2 px-4 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={() => navigator.clipboard.writeText(draft.body)}>Copy to clipboard</button>
                      <a href={`/leads/${draft.lead_id}`} className="text-xs font-semibold py-2 px-4 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>View lead</a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function StatusBadge({ status }) {
  const styles = {
    pending_review: 'bg-amber-500/15 text-amber-400',
    approved: 'bg-green-500/15 text-green-400',
    sent: 'bg-blue-500/15 text-blue-400',
  }
  const labels = { pending_review: 'Pending', approved: 'Approved', sent: 'Sent' }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] || ''}`}>{labels[status] || status}</span>
}
