'use client'
import { useState, useEffect } from 'react'
import { getDrafts, updateDraftStatus, getUserContext } from '@/lib/supabase'

export default function OutreachPage() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [assignedIds, setAssignedIds] = useState(null)

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext()
      const ids = ctx?.assignedLeadIds || null
      setAssignedIds(ids)
      const data = await getDrafts(filter === 'all' ? null : filter, ids)
      setDrafts(data)
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [filter])

  async function handleStatusUpdate(id, status) {
    await updateDraftStatus(id, status)
    const data = await getDrafts(filter === 'all' ? null : filter, assignedIds)
    setDrafts(data)
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
          <p className="text-sm text-slate-500 mt-1">Review, approve, and track AI-generated outreach</p>
        </div>
        <div className="text-sm text-slate-500">{drafts.length} emails</div>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'pending_review', 'approved', 'sent'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`tab ${filter === f ? 'active' : ''}`}>
            {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f === 'approved' ? 'Approved' : 'Sent'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-accent animate-pulse text-sm">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-20 text-slate-650">No drafts match this filter</div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map(draft => (
            <div key={draft.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-semibold text-white">{draft.address}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: draft.score >= 75 ? '#ff6b35' : '#fbbf24' }}>
                      {draft.score}
                    </span>
                    <StatusBadge status={draft.status} />
                    <span className="text-xs text-slate-650">{draft.channel}</span>
                  </div>
                  <div className="text-sm text-accent-light font-medium">{draft.subject}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(expanded === draft.id ? null : draft.id)}
                    className="btn-secondary text-xs py-1.5 px-3">
                    {expanded === draft.id ? 'Collapse' : 'Preview'}
                  </button>
                  {draft.status === 'pending_review' && (
                    <button className="btn-primary text-xs py-1.5 px-3" onClick={() => handleStatusUpdate(draft.id, 'approved')}>
                      Approve
                    </button>
                  )}
                </div>
              </div>

              {expanded !== draft.id && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{draft.body?.substring(0, 150)}...</p>
              )}

              {expanded === draft.id && (
                <div className="mt-4">
                  <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-navy-900 rounded-lg p-4 mb-3 border border-navy-600">
                    {draft.body}
                  </div>
                  <div className="flex gap-2">
                    {draft.status === 'pending_review' && (
                      <button className="btn-primary text-xs" onClick={() => handleStatusUpdate(draft.id, 'approved')}>Approve</button>
                    )}
                    {draft.status === 'approved' && (
                      <button className="btn-primary text-xs" onClick={() => handleStatusUpdate(draft.id, 'sent')}>Mark as sent</button>
                    )}
                    <button className="btn-secondary text-xs" onClick={() => navigator.clipboard.writeText(draft.body)}>Copy to clipboard</button>
                    <a href={`/leads/${draft.lead_id}`} className="btn-secondary text-xs">View lead</a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
