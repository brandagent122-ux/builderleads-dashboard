'use client'
import { useState, useEffect, useRef } from 'react'
import { getDrafts, updateDraftStatus, getUserContext, getActiveMarket } from '@/lib/supabase'

function TypingText({ text, onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const [cursor, setCursor] = useState(true)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!text) return
    indexRef.current = 0
    setDisplayed('')

    const interval = setInterval(() => {
      indexRef.current += 1
      // Speed: type faster through spaces and punctuation
      const char = text[indexRef.current - 1]
      if (char === ' ' || char === ',' || char === '.') {
        indexRef.current += 1
      }
      setDisplayed(text.substring(0, indexRef.current))
      if (indexRef.current >= text.length) {
        clearInterval(interval)
        setCursor(false)
        if (onComplete) onComplete()
      }
    }, 18)

    const cursorBlink = setInterval(() => setCursor(c => !c), 530)

    return () => { clearInterval(interval); clearInterval(cursorBlink) }
  }, [text])

  return (
    <span>
      {displayed}
      {indexRef.current < (text || '').length && (
        <span style={{ opacity: cursor ? 1 : 0, color: '#FF7A3D', fontWeight: 700, transition: 'opacity 0.1s' }}>|</span>
      )}
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
  const [animatingDraftId, setAnimatingDraftId] = useState(null)
  const [animatingSubject, setAnimatingSubject] = useState(false)
  const [animatingBody, setAnimatingBody] = useState(false)
  const [newDraftData, setNewDraftData] = useState(null)
  const newDraftRef = useRef(null)

  useEffect(() => {
    // Check for newly created draft
    const raw = localStorage.getItem('bl_new_draft')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        // Only animate if created in the last 30 seconds
        if (Date.now() - data.ts < 30000) {
          setNewDraftData(data)
          setAnimatingDraftId(data.id)
        }
      } catch {}
      localStorage.removeItem('bl_new_draft')
    }
  }, [])

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

      // Auto-expand and scroll to new draft
      if (animatingDraftId) {
        setExpanded(animatingDraftId)
        setTimeout(() => {
          if (newDraftRef.current) {
            newDraftRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          // Start subject animation, then body
          setAnimatingSubject(true)
        }, 400)
      }
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
    const data = await getDrafts(filter === 'all' ? null : filter, assignedIds)
    setDrafts(data)
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text)
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

      {loading ? (
        <div className="text-center py-20 text-accent animate-pulse text-sm">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-20 text-slate-650">No drafts match this filter</div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map(draft => {
            const isAnimating = draft.id === animatingDraftId
            const isExpanded = expanded === draft.id

            return (
              <div
                key={draft.id}
                ref={isAnimating ? newDraftRef : null}
                className="card p-5"
                style={{
                  borderLeft: isAnimating ? '3px solid #FF7A3D' : '3px solid transparent',
                  transition: 'border-color 0.5s',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-white">{draft.address}</span>
                      <span className="text-xs font-bold font-mono" style={{ color: draft.score >= 75 ? '#ff6b35' : '#fbbf24' }}>
                        {draft.score}
                      </span>
                      <StatusBadge status={draft.status} />
                      {isAnimating && !animatingBody && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: '#FF7A3D15', color: '#FF7A3D', animation: 'pulse 1.5s infinite' }}>
                          AI DRAFTING
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-accent-light font-medium">
                      {isAnimating && animatingSubject && !animatingBody ? (
                        <TypingText text={draft.subject} onComplete={() => setAnimatingBody(true)} />
                      ) : (
                        draft.subject
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpanded(isExpanded ? null : draft.id)}
                      className="btn-secondary text-xs py-1.5 px-3">
                      {isExpanded ? 'Collapse' : 'Preview'}
                    </button>
                    {draft.status === 'pending_review' && !isAnimating && (
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
                      {isAnimating && animatingBody ? (
                        <TypingText text={draft.body} onComplete={() => setAnimatingDraftId(null)} />
                      ) : (
                        draft.body
                      )}
                    </div>

                    {/* Action buttons */}
                    {(!isAnimating || !animatingBody) ? null : null}
                    <div className="flex gap-2 flex-wrap" style={{ opacity: isAnimating && animatingBody ? 0.3 : 1, transition: 'opacity 0.5s' }}>
                      {draft.status === 'pending_review' && (
                        <button
                          className="text-xs font-semibold py-2 px-4 rounded-lg"
                          style={{ background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8020' }}
                          onClick={() => handleStatusUpdate(draft.id, 'approved')}
                          disabled={isAnimating}>
                          Approve
                        </button>
                      )}
                      {draft.status === 'approved' && (
                        <button
                          className="text-xs font-semibold py-2 px-4 rounded-lg"
                          style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f620' }}
                          onClick={() => handleStatusUpdate(draft.id, 'sent')}>
                          Mark as sent
                        </button>
                      )}
                      <button
                        className="text-xs font-semibold py-2 px-4 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={() => handleCopy(draft.body)}>
                        Copy to clipboard
                      </button>
                      <a href={`/leads/${draft.lead_id}`}
                        className="text-xs font-semibold py-2 px-4 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                        View lead
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending_review: 'bg-amber-500/15 text-amber-400',
    approved: 'bg-green-500/15 text-green-400',
    sent: 'bg-blue-500/15 text-blue-400',
  }
  const labels = { pending_review: 'Pending', approved: 'Approved', sent: 'Sent' }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] || ''}`}>{labels[status] || status}</span>
}
