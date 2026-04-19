'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getLeadDetail, updateDraftStatus } from '@/lib/supabase'

export default function LeadDetailPage() {
  const params = useParams()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('bl_saved_leads')
    if (s) {
      const set = new Set(JSON.parse(s))
      setSaved(set.has(parseInt(params.id)))
    }

    async function load() {
      const data = await getLeadDetail(params.id)
      setLead(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  function toggleSave() {
    const s = localStorage.getItem('bl_saved_leads')
    const set = s ? new Set(JSON.parse(s)) : new Set()
    const id = parseInt(params.id)
    if (set.has(id)) { set.delete(id); setSaved(false) }
    else { set.add(id); setSaved(true) }
    localStorage.setItem('bl_saved_leads', JSON.stringify([...set]))
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-accent animate-pulse text-sm">Loading lead...</div></div>
  if (!lead) return <div className="p-8 text-slate-500">Lead not found</div>

  const scoreColor = lead.score >= 85 ? '#ff6b35' : lead.score >= 75 ? '#ff8f65' : lead.score >= 50 ? '#fbbf24' : '#6b7280'
  const totalPermits = 1 + (lead.stackedPermits?.length || 0)

  return (
    <div className="p-8 max-w-5xl">
      <a href="/leads" className="text-sm text-slate-500 hover:text-accent transition-colors mb-4 inline-block">&larr; Back to all leads</a>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{lead.address}</h1>
            <button onClick={toggleSave} className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors" title={saved ? 'Remove from saved' : 'Save lead'}>
              <svg width="22" height="22" viewBox="0 0 24 24"
                fill={saved ? '#ff6b35' : 'none'}
                stroke={saved ? '#ff6b35' : '#4a4d63'}
                strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <DamageBadge damage={lead.dins_damage} />
            <span className="badge badge-permit">{lead.permit_type}</span>
            <span className="badge badge-stage">{lead.permit_stage}</span>
            {totalPermits > 1 && <span className="badge badge-stack">{totalPermits} permits stacked</span>}
            {lead.is_perimeter_edge && <span className="badge badge-fire">Perimeter edge</span>}
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

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Property details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Bedrooms" value={lead.beds || '-'} />
            <Detail label="Bathrooms" value={lead.baths || '-'} />
            <Detail label="Square feet" value={lead.sqft ? lead.sqft.toLocaleString() : '-'} />
            <Detail label="Year built" value={lead.year_built || '-'} />
            <Detail label="Assessed value" value={lead.assessor_value ? `$${(lead.assessor_value / 1e6).toFixed(2)}M` : '-'} />
            <Detail label="APN" value={lead.apn || '-'} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Fire damage intel</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="DINS classification" value={lead.dins_damage || '-'} />
            <Detail label="Structure type" value={lead.dins_structure_type || '-'} />
            <Detail label="Fire damage flag" value={lead.fire_damage_flag || '-'} />
            <Detail label="Fire zone" value={lead.fire_zone_match ? 'Inside perimeter' : 'Outside'} />
            <Detail label="Distance to perimeter" value={lead.fire_zone_distance_ft != null ? `${Math.round(lead.fire_zone_distance_ft)} ft` : '-'} />
            <Detail label="DINS match accuracy" value={lead.dins_match_distance_m != null ? `${Math.round(lead.dins_match_distance_m)}m` : '-'} />
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Permit timeline</h3>
        <div className="grid grid-cols-4 gap-4">
          <Detail label="Permit number" value={lead.permit_number || '-'} />
          <Detail label="Filed" value={formatDate(lead.permit_filed_at)} />
          <Detail label="Issued" value={formatDate(lead.permit_issued_at)} />
          <Detail label="Permit value" value={lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'} />
        </div>
        {(lead.permit_filed_at || lead.permit_issued_at) && (
          <div className="mt-4 flex items-center gap-2">
            {lead.permit_filed_at && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent/50" />
                <span className="text-xs text-slate-500">Filed {formatDate(lead.permit_filed_at)}</span>
              </div>
            )}
            {lead.permit_filed_at && lead.permit_issued_at && (
              <div className="flex-1 h-px bg-accent/20 mx-2" />
            )}
            {lead.permit_issued_at && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-xs text-slate-500">Issued {formatDate(lead.permit_issued_at)}</span>
              </div>
            )}
            <div className="flex-1 h-px bg-navy-600 mx-2" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-slate-650" />
              <span className="text-xs text-slate-650">{lead.permit_stage}</span>
            </div>
          </div>
        )}
      </div>

      {lead.stackedPermits && lead.stackedPermits.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            Permit stack at this address
            <span className="ml-2 text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-semibold">{totalPermits} total</span>
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800 border border-accent/30">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <div className="flex-1">
                <span className="text-sm text-white font-medium">{lead.permit_type}</span>
                <span className="text-xs text-slate-500 ml-2">#{lead.permit_number}</span>
              </div>
              <span className="badge badge-stage">{lead.permit_stage}</span>
              <span className="text-xs text-slate-500">{formatDate(lead.permit_issued_at)}</span>
              <span className="text-xs text-accent font-medium">Current</span>
            </div>
            {lead.stackedPermits.map(p => (
              <a href={`/leads/${p.id}`} key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-navy-800 border border-navy-600 hover:border-accent/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-slate-650" />
                <div className="flex-1">
                  <span className="text-sm text-slate-300">{p.permit_type}</span>
                  <span className="text-xs text-slate-650 ml-2">#{p.permit_number}</span>
                </div>
                <span className="badge badge-stage">{p.permit_stage}</span>
                <span className="text-xs text-slate-500">{formatDate(p.permit_issued_at)}</span>
                {p.estimated_value > 0 && <span className="text-xs text-slate-500">${p.estimated_value.toLocaleString()}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {lead.reasoning && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">AI score reasoning</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{lead.reasoning}</p>
        </div>
      )}

      {lead.permit_description && (
        <div className="card p-5 mb-6">
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

function formatDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
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
          <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-navy-900 rounded-lg p-4 mb-3">{draft.body}</div>
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
  const styles = { pending_review: 'bg-amber-500/15 text-amber-400', approved: 'bg-green-500/15 text-green-400', sent: 'bg-blue-500/15 text-blue-400' }
  const labels = { pending_review: 'Pending', approved: 'Approved', sent: 'Sent' }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] || ''}`}>{labels[status] || status}</span>
}

function DamageBadge({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const cls = damage.includes('Destroyed') ? 'badge-destroyed' : damage.includes('Major') ? 'badge-major' : damage.includes('Minor') ? 'badge-minor' : damage.includes('Affected') ? 'badge-affected' : 'badge-nodamage'
  const label = damage.includes('Destroyed') ? 'Destroyed' : damage.includes('Major') ? 'Major' : damage.includes('Minor') ? 'Minor' : damage.includes('Affected') ? 'Affected' : 'No damage'
  return <span className={`badge ${cls}`}>{label}</span>
}
