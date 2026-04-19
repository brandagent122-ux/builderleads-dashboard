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
    <div className="flex gap-5">
      {/* Main column */}
      <div className="flex-1 min-w-0">
        {/* Hero */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl text-ink-0">
              <span className="font-serif italic text-4xl">Hello</span>{' '}
              <span className="font-serif text-4xl">there,</span>
            </h1>
            <p className="font-mono text-[12px] text-ink-2 mt-2 tracking-wider uppercase">
              Palisades Fire Intel &middot; {today}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <div className="font-mono text-[11px] text-ember bg-[var(--ember-wash)] px-3 py-1.5 rounded-xl border border-ember/20">
                {newCount} NEW SINCE LAST VISIT
              </div>
            )}
            <Orb />
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <KPITile icon="layers" label="Total Leads" value={stats.totalLeads.toLocaleString()} sub="+5 today" />
          <KPITile icon="flame" label="Hot Leads 75+" value={stats.hotLeads.toLocaleString()} sub={`${Math.round(stats.hotLeads/stats.totalLeads*100)}%`} accent />
          <KPITile icon="alert" label="Destroyed" value={stats.destroyed.toLocaleString()} sub={`${Math.round(stats.destroyed/stats.totalLeads*100)}%`} />
          <KPITile icon="dollar" label="Est. Rebuild Value" value={formatMoney(stats.rebuildValue)} sub="+$42M wk" />
        </div>

        {/* Top leads header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg text-ink-0">
              <span className="font-serif">Top leads </span>
              <span className="font-serif italic">today</span>
            </h2>
            <span className="font-mono text-[11px] text-ember bg-[var(--ember-wash)] px-2.5 py-1 rounded-lg">
              TOP {leads.length}
            </span>
          </div>
          <a href="/leads" className="font-mono text-[11px] text-ink-2 hover:text-ember transition-colors">
            View all &rarr;
          </a>
        </div>

        {/* Lead cards */}
        <div className="flex flex-col gap-3">
          {leads.map((lead, i) => (
            <LeadCard key={lead.id} lead={lead} rank={i + 1} isNew={isNew(lead)}
              onClick={() => { markSeen(lead.id); router.push(`/leads/${lead.id}`) }} />
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <a href="/outreach" className="card-raised p-5 flex items-center gap-4 card-hover cursor-pointer">
            <div className="icon-chip icon-chip-sunk">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <div className="text-[15px] font-medium text-ink-0">Review outreach queue</div>
              <div className="font-mono text-[12px] text-ink-2 mt-0.5">{stats.pendingDrafts} DRAFTS PENDING</div>
            </div>
          </a>
          <a href="/map" className="card-raised p-5 flex items-center gap-4 card-hover cursor-pointer">
            <div className="icon-chip icon-chip-sunk">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            </div>
            <div>
              <div className="text-[15px] font-medium text-ink-0">View fire zone map</div>
              <div className="font-mono text-[12px] text-ink-2 mt-0.5">{stats.totalLeads} ACTIVE LEADS</div>
            </div>
          </a>
        </div>
      </div>

      {/* Right rail */}
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
        {/* Rebuild value card */}
        <div className="card-raised-lg p-5">
          <div className="font-mono text-[12px] text-ink-2 tracking-wider mb-2">EST. REBUILD VALUE &middot; 7D</div>
          <div className="text-[28px] font-bold text-ink-0">{formatMoney(stats.rebuildValue)}</div>
          <div className="mt-3 h-10 card-sunk rounded-lg flex items-end px-2 pb-1 gap-[2px]">
            {[30,45,38,55,42,65,70].map((h,i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `linear-gradient(to top, var(--ember-lo), var(--ember))` }} />
            ))}
          </div>
        </div>

        {/* Score distribution card */}
        <div className="card-raised-lg p-5">
          <div className="font-mono text-[12px] text-ink-2 tracking-wider mb-3">SCORE BUCKETS</div>
          <div className="flex flex-col gap-2">
            {[
              { label: '90-100', pct: 3 },
              { label: '75-89', pct: 32 },
              { label: '50-74', pct: 48 },
              { label: '25-49', pct: 14 },
              { label: '0-24', pct: 3 },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-ink-2 w-10">{b.label}</span>
                <div className="flex-1 h-2 card-sunk rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: 'linear-gradient(90deg, var(--ember-lo), var(--ember))' }} />
                </div>
                <span className="font-mono text-[11px] text-ink-2 w-8 text-right">{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Atlas brief */}
        <div className="atlas-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-ember animate-pulse" />
            <span className="font-mono text-[11px] text-ember tracking-wider">ATLAS &middot; BRIEF</span>
          </div>
          <p className="text-[14px] text-ink-1 leading-relaxed">
            Pipeline ran successfully at <mark>5:00 AM PT</mark>. Detected <mark>{stats.hotLeads} high-priority</mark> leads
            across the fire zone. <mark>{stats.destroyed} properties</mark> confirmed destroyed by CAL FIRE inspections.
            {stats.pendingDrafts > 0 && <> <mark>{stats.pendingDrafts} outreach drafts</mark> pending review.</>}
          </p>
          <div className="flex gap-4 mt-4 pt-3 border-t border-[rgba(255,122,61,0.15)]">
            <div>
              <div className="font-mono text-[9px] text-ink-3">NEW</div>
              <div className="text-lg font-bold text-ink-0">5</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-ink-3">HOT</div>
              <div className="text-lg font-bold text-ember">{stats.hotLeads}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-ink-3">DRAFTS</div>
              <div className="text-lg font-bold text-ink-0">{stats.pendingDrafts}</div>
            </div>
          </div>
        </div>
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
      <div className="font-mono text-[12px] text-ink-2 tracking-wider uppercase">{label}</div>
      <div className={`text-[38px] font-bold leading-none mt-1 tracking-tight ${accent ? 'text-ember' : 'text-ink-0'}`}>{value}</div>
      <div className="font-mono text-[12px] text-ink-2 mt-1">{sub}</div>
    </div>
  )
}

function LeadCard({ lead, rank, isNew, onClick }) {
  const scoreColor = lead.score >= 85 ? 'var(--ember)' : lead.score >= 75 ? 'var(--ember-hi)' : lead.score >= 50 ? 'var(--amber)' : 'var(--ink-3)'
  const c = 2 * Math.PI * 16
  const o = c - (lead.score / 100) * c

  return (
    <div onClick={onClick}
      className={`card-raised card-hover p-4 flex items-center gap-4 cursor-pointer ${isNew ? 'lead-new' : ''}`}>
      <span className="font-mono text-[12px] text-ink-2 w-5 text-center">{rank}</span>

      <div className="relative w-10 h-10 flex-shrink-0">
        <svg width="40" height="40" viewBox="0 0 40 40" className="score-ring">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--card-sunk)" strokeWidth="3" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={scoreColor} strokeWidth="3"
            strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold" style={{ color: scoreColor }}>
          {lead.score}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-ink-0">{lead.address}</span>
          {isNew && <span className="tag tag-new text-[9px]">NEW</span>}
        </div>
        <div className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider">
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
        {lead.created_at && <span className="font-mono text-[12px] text-ink-2">{timeAgo(lead.created_at)}</span>}
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

function Orb() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="opacity-30">
      <defs>
        <linearGradient id="orb-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#666" />
          <stop offset="50%" stopColor="#333" />
          <stop offset="100%" stopColor="#111" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#orb-g)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {[...Array(8)].map((_, i) => (
        <ellipse key={i} cx="32" cy="32" rx={28 - i * 3} ry="28" fill="none" stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5" transform={`rotate(${i * 22.5} 32 32)`} />
      ))}
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-5">
      <div className="flex-1">
        <div className="skeleton h-12 w-64 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-36" style={{ borderRadius: 'var(--r-card-lg)' }} />)}
        </div>
        <div className="skeleton h-8 w-48 mb-4" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 mb-3" style={{ borderRadius: 'var(--r-card)' }} />)}
      </div>
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40" style={{ borderRadius: 'var(--r-card-lg)' }} />)}
      </div>
    </div>
  )
}

function formatMoney(val) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`
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
