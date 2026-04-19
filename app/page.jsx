'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStats, getTopLeads } from '@/lib/supabase'

export default function CommandCenter() {
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [seenIds, setSeenIds] = useState(new Set())
  const [lastVisit, setLastVisit] = useState(null)
  const [showBrief, setShowBrief] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('bl_seen_leads')
    const storedVisit = localStorage.getItem('bl_last_visit')
    if (stored) setSeenIds(new Set(JSON.parse(stored)))
    if (storedVisit) setLastVisit(new Date(storedVisit))

    async function load() {
      const [s, l] = await Promise.all([getStats(), getTopLeads(20)])
      const byAddr = {}
      l.forEach(lead => {
        if (!byAddr[lead.address] || lead.score > byAddr[lead.address].score) {
          byAddr[lead.address] = { ...lead, permitCount: l.filter(x => x.address === lead.address).length }
        }
      })
      setStats(s)
      setLeads(Object.values(byAddr).sort((a, b) => b.score - a.score).slice(0, 10))
      setLoading(false)
    }
    load()
    localStorage.setItem('bl_last_visit', new Date().toISOString())
  }, [])

  function markSeen(id) {
    const updated = new Set(seenIds)
    updated.add(id)
    setSeenIds(updated)
    localStorage.setItem('bl_seen_leads', JSON.stringify([...updated]))
  }

  function isNew(lead) {
    if (seenIds.has(lead.id)) return false
    if (!lastVisit) return false
    return lead.created_at && new Date(lead.created_at) > lastVisit
  }

  if (loading) return <LoadingSkeleton />

  const newCount = leads.filter(l => isNew(l)).length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-ink-0 tracking-tight">Command Center</h1>
          <p className="font-mono text-[11px] text-ink-3 mt-2 tracking-wider uppercase">
            Palisades Fire Intel &middot; {today}
          </p>
        </div>
        {newCount > 0 && (
          <div className="font-mono text-[11px] text-ember bg-[var(--ember-wash)] px-3 py-1.5 rounded-xl border border-ember/20">
            {newCount} NEW SINCE LAST VISIT
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPITile icon="layers" label="Total Leads" value={stats.totalLeads.toLocaleString()} sub="+5 today" />
        <KPITile icon="flame" label="Hot Leads 75+" value={stats.hotLeads.toLocaleString()} sub={`${Math.round(stats.hotLeads/stats.totalLeads*100)}%`} accent />
        <KPITile icon="alert" label="Destroyed" value={stats.destroyed.toLocaleString()} sub={`${Math.round(stats.destroyed/stats.totalLeads*100)}%`} />
        <KPITile icon="dollar" label="Est. Rebuild Value" value={formatMoney(stats.rebuildValue)} sub="+$42M wk" />
      </div>

      {showBrief && (
        <div className="atlas-card p-4 mb-6 flex items-start gap-4">
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <div className="w-2 h-2 rounded-full bg-ember animate-pulse" />
            <span className="font-mono text-[11px] text-ember tracking-wider">UPDATE</span>
          </div>
          <p className="text-[14px] text-ink-1 leading-relaxed flex-1">
            Pipeline ran at <mark>5:00 AM PT</mark>. <mark>{stats.hotLeads} high-priority</mark> leads detected.
            <mark>{stats.destroyed} properties</mark> confirmed destroyed.
            {stats.pendingDrafts > 0 && <> <mark>{stats.pendingDrafts} outreach drafts</mark> pending review.</>}
          </p>
          <button onClick={() => setShowBrief(false)} className="text-ink-3 hover:text-ink-1 transition-colors flex-shrink-0 p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-ink-0">Top leads by score</h2>
          <span className="font-mono text-[11px] text-ember bg-[var(--ember-wash)] px-2.5 py-1 rounded-lg">TOP {leads.length}</span>
        </div>
        <a href="/leads" className="font-mono text-[11px] text-ink-2 hover:text-ember transition-colors">View all &rarr;</a>
      </div>

      <div className="flex flex-col gap-3">
        {leads.map((lead, i) => (
          <LeadCard key={lead.id} lead={lead} rank={i + 1} isNew={isNew(lead)}
            onClick={() => { markSeen(lead.id); router.push(`/leads/${lead.id}`) }} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <a href="/outreach" className="card-raised p-5 flex items-center gap-4 card-hover cursor-pointer">
          <div className="icon-chip icon-chip-sunk">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <div className="text-[15px] font-medium text-ink-0">Review outreach queue</div>
            <div className="font-mono text-[11px] text-ink-3 mt-0.5">{stats.pendingDrafts} DRAFTS PENDING</div>
          </div>
        </a>
        <a href="/map" className="card-raised p-5 flex items-center gap-4 card-hover cursor-pointer">
          <div className="icon-chip icon-chip-sunk">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </div>
          <div>
            <div className="text-[15px] font-medium text-ink-0">View fire zone map</div>
            <div className="font-mono text-[11px] text-ink-3 mt-0.5">{stats.totalLeads} ACTIVE LEADS</div>
          </div>
        </a>
      </div>
    </div>
  )
}

function KPITile({ icon, label, value, sub, accent }) {
  const icons = {
    layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    flame: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22c4-4 8-7.5 8-12a8 8 0 0 0-16 0c0 4.5 4 8 8 12z"/></svg>,
    alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    dollar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  }
  return (
    <div className="card-raised-lg p-5">
      <div className={`icon-chip ${accent ? 'icon-chip-ember' : 'icon-chip-sunk'} mb-3`} style={{ color: accent ? 'var(--page)' : 'var(--ember)' }}>
        {icons[icon]}
      </div>
      <div className="font-mono text-[11px] text-ink-3 tracking-wider uppercase">{label}</div>
      <div className={`text-[38px] font-bold leading-none mt-1 tracking-tight ${accent ? 'text-ember' : 'text-ink-0'}`}>{value}</div>
      <div className="font-mono text-[11px] text-ink-3 mt-1">{sub}</div>
    </div>
  )
}

function LeadCard({ lead, rank, isNew, onClick }) {
  const scoreColor = lead.score >= 85 ? 'var(--ember)' : lead.score >= 75 ? 'var(--ember-hi)' : lead.score >= 50 ? 'var(--amber)' : 'var(--ink-3)'
  const c = 2 * Math.PI * 19, o = c - (lead.score / 100) * c
  return (
    <div onClick={onClick} className={`card-raised card-hover p-4 flex items-center gap-4 cursor-pointer ${isNew ? 'lead-new' : ''}`}>
      <span className="font-mono text-[11px] text-ink-2 w-5 text-center">{rank}</span>
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg width="48" height="48" viewBox="0 0 48 48" className="score-ring">
          <circle cx="24" cy="24" r="19" fill="none" stroke="var(--card-sunk)" strokeWidth="3" />
          <circle cx="24" cy="24" r="19" fill="none" stroke={scoreColor} strokeWidth="3" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold" style={{ color: scoreColor }}>{lead.score}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-ink-0">{lead.address}</span>
          {isNew && <span className="tag tag-new text-[9px]">NEW</span>}
        </div>
        <div className="font-mono text-[11px] text-ink-2 mt-1 tracking-wider">
          {lead.beds > 0 && `${lead.beds} BED`}{lead.baths > 0 && ` \u00B7 ${lead.baths} BATH`}{lead.sqft > 0 && ` \u00B7 ${lead.sqft.toLocaleString()} SQFT`}{lead.year_built > 0 && ` \u00B7 BUILT ${lead.year_built}`}{lead.assessor_value > 0 && ` \u00B7 $${(lead.assessor_value / 1e6).toFixed(1)}M`}
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <DamageTag damage={lead.dins_damage} />
          <span className="tag tag-permit">{lead.permit_type}</span>
          <span className="tag tag-stage">{lead.permit_stage}</span>
          {lead.permitCount > 1 && <span className="tag tag-stack">{lead.permitCount} PERMITS</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {lead.created_at && <span className="font-mono text-[11px] text-ink-3">{timeAgo(lead.created_at)}</span>}
        <span className="btn-ghost text-[11px] py-1.5 px-3">Details &rarr;</span>
      </div>
    </div>
  )
}

function DamageTag({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const cls = damage.includes('Destroyed') ? 'tag-destroyed' : damage.includes('Major') ? 'tag-major' : damage.includes('Minor') ? 'tag-minor' : damage.includes('Affected') ? 'tag-affected' : 'tag-nodamage'
  const label = damage.includes('Destroyed') ? 'DESTROYED' : damage.includes('Major') ? 'MAJOR' : damage.includes('Minor') ? 'MINOR' : damage.includes('Affected') ? 'AFFECTED' : 'NO DAMAGE'
  return <span className={`tag ${cls}`}>{label}</span>
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton h-12 w-64 mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36" style={{ borderRadius: 'var(--r-card-lg)' }} />)}
      </div>
      <div className="skeleton h-16 mb-6" style={{ borderRadius: 'var(--r-card)' }} />
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 mb-3" style={{ borderRadius: 'var(--r-card)' }} />)}
    </div>
  )
}

function formatMoney(val) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val}`
}

function timeAgo(dateStr) {
  try {
    const d = new Date(dateStr), now = new Date(), diff = now - d
    const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}M AGO`
    if (hours < 24) return `${hours}H AGO`
    if (days < 7) return `${days}D AGO`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  } catch { return '' }
}
