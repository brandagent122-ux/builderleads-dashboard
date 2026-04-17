'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getLeadDetail, updateDraftStatus } from '@/lib/supabase'

export default function LeadDetailPage({ params }) {
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getLeadDetail(params.id)
      setLead(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-accent animate-pulse text-sm">Loading lead...</div></div>
  if (!lead) return <div className="p-8 text-slate-500">Lead not found</div>

  const scoreColor = lead.score >= 85 ? '#ff6b35' : lead.score >= 75 ? '#ff8f65' : lead.score >= 50 ? '#fbbf24' : '#6b7280'

  return (
    <div className="p-8 max-w-5xl">
      <a href="/leads" className="text-sm text-slate-500 hover:text-accent transition-colors mb-4 inline-block">&larr; Back to all leads</a>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{lead.address}</h1>
          <div className="flex gap-2 mt-2">
            <DamageBadge damage={lead.dins_damage} />
            <span className="badge badge-permit">{lead.permit_type}</span>
            <span className="badge badge-stage">{lead.permit_stage}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="relative w-[72px] h-[72px]">
            <svg width="72" height="72" viewBox="0 0 72 72" className="score-ring">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#1e2030" strokeWidth="4" />
              <circle cx="36" cy="36" r="30" fill="none" stroke={scoreColor} strokeWidth="4"
                strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - lead.score / 100)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold" style={{ color: scoreColor }}>
              {lead.score}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">Score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Property details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Bedrooms" value={lead.beds || '-'} />
            <Detail label="Bathrooms" value={lead.baths || '-'} />
            <Detail label="Square feet" value={lead.sqft ? lead.sqft.toLocaleString() : '-'} />
            <Detail label="Year built" value={lead.year_built || '-'} />
            <Detail label="Assessed value" value={lead.assessor_value ? `$${(lead.assessor_value / 1e6).toFixed(2)}M` : '-'} />
            <Detail label="Permit value" value={lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Fire damage intel</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="DINS classification" value={lead.dins_damage || '-'} />
            <Detail label="Structure type" value={lead.dins_structure_type || '-'} />
            <Detail label="Fire damage flag" value={lead.fire_damage_flag || '-'} />
            <Detail label="Fire zone" value={lead.fire_zone_match ? 'Inside perimeter' : 'Outside'} />
          </div>
        </div>
      </div>

      {lead.reasoning && (
        <div className="card p-5 mb-8">
          <h3 className="text-sm font-semibold text-white mb-3">AI score reasoning</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{lead.reasoning}</p>
        </div>
      )}

      {lead.permit_description && (
        <div className="card p-5 mb-8">
          <h3 className="text-sm font-semibold text-white mb-3">Permit description</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{lead.permit_description}</p>
        </div>
      )}

      {lead.drafts && lead.drafts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-white mb-4">Draft outreach ({lead.drafts.length})</h3>
          <div className="flex flex-col gap-3">
            {lead.drafts.map(draft => (
              <DraftCard key={draft.id} draft={draft} onUpdate={async (id, status) => {
                await updateDraftStatus(id, status)
                const updated = await getLeadDetail(params.id)
                setLead(updated)
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-650 mb-1">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  )
}

function DraftCard({ draft, onUpdate }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-white">{draft.subject}</div>
        <div className="flex items-center gap-2">
          <StatusBadge status={draft.status} />
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-500 hover:text-accent">
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3">
          <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-navy-900 rounded-lg p-4 mb-3">
            {draft.body}
          </div>
          {draft.status === 'pending_review' && (
            <div className="flex gap-2">
              <button className="btn-primary text-xs" onClick={() => onUpdate(draft.id, 'approved')}>Approve</button>
              <button className="btn-secondary text-xs" onClick={() => navigator.clipboard.writeText(draft.body)}>Copy</button>
            </div>
          )}
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

function DamageBadge({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const cls = damage.includes('Destroyed') ? 'badge-destroyed'
    : damage.includes('Major') ? 'badge-major'
    : damage.includes('Minor') ? 'badge-minor'
    : damage.includes('Affected') ? 'badge-affected' : 'badge-nodamage'
  const label = damage.includes('Destroyed') ? 'Destroyed'
    : damage.includes('Major') ? 'Major'
    : damage.includes('Minor') ? 'Minor'
    : damage.includes('Affected') ? 'Affected' : 'No damage'
  return <span className={`badge ${cls}`}>{label}</span>
}
