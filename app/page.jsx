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

      // Deduplicate by address, keep highest score
      const byAddr = {}
      l.forEach(lead => {
        if (!byAddr[lead.address] || lead.score > byAddr[lead.address].score) {
          byAddr[lead.address] = { ...lead, permitCount: 1 }
        } else {
          byAddr[lead.address].permitCount = (byAddr[lead.address].permitCount || 1) + 1
        }
      })
      // Count permits per address
      l.forEach(lead => {
        if (byAddr[lead.address]) {
          byAddr[lead.address].permitCount = l.filter(x => x.address === lead.address).length
        }
      })

      const deduped = Object.values(byAddr).sort((a, b) => b.score - a.score).slice(0, 10)

      setStats(s)
      setLeads(deduped)
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
    if (!lead.created_at) return true
    return new Date(lead.created_at) > lastVisit
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-accent animate-pulse text-sm">Loading intel...</div></div>

  const newCount = leads.filter(l => isNew(l)).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">Palisades fire rebuild intelligence</p>
        </div>
        <div className="flex items-center gap-4">
          {newCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/15 border border-accent/30">
              <span className="text-sm font-semibold text-accent">{newCount} new</span>
              <span className="text-xs text-accent/70">since last visit</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-navy-600 bg-navy-800">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">Live data</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total leads" value={stats.totalLeads.toLocaleString()} />
        <StatCard label="Hot leads (75+)" value={stats.hotLeads.toLocaleString()} highlight color="#ff6b35" />
        <StatCard label="Destroyed" value={stats.destroyed.toLocaleString()} color="#f87171" />
        <StatCard label="Est. rebuild value" value={formatMoney(stats.rebuildValue)} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Top leads by score</h2>
          <span className="text-xs bg-accent/15 text-accent px-2.5 py-1 rounded-full font-semibold">TOP {leads.length}</span>
        </div>
        <a href="/leads" className="text-sm text-accent hover:text-accent-light transition-colors">View all &rarr;</a>
      </div>

      <div className="flex flex-col gap-3">
        {leads.map((lead, i) => (
          <div key={lead.id} onClick={() => { markSeen(lead.id); router.push(`/leads/${lead.id}`) }}
            className="lead-row"
            style={isNew(lead) ? { borderColor: '#ff6b35', boxShadow: '0 0 12px rgba(255,107,53,0.15)' } : {}}>

            <div className="text-sm text-slate-650 w-6 text-center font-mono">{i + 1}</div>

            <ScoreRing score={lead.score} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{lead.address}</span>
                {isNew(lead) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent text-navy-950 animate-pulse">NEW</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {lead.beds > 0 && `${lead.beds} bed / `}{lead.baths > 0 && `${lead.baths} bath / `}{lead.sqft > 0 && `${lead.sqft.toLocaleString()} sqft / `}{lead.year_built > 0 && `Built ${lead.year_built} / `}{lead.assessor_value > 0 && `$${(lead.assessor_value / 1e6).toFixed(1)}M`}
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <DamageBadge damage={lead.dins_damage} />
                <span className="badge badge-permit">{lead.permit_type}</span>
                <span className="badge badge-stage">{lead.permit_stage}</span>
                {lead.permitCount > 1 && <span className="badge badge-stack">{lead.permitCount} permits</span>}
                {lead.created_at && <span className="text-[10px] text-slate-650 ml-1">{timeAgo(lead.created_at)}</span>}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <span className="btn-primary text-xs">Details</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <a href="/outreach" className="card card-accent p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Review outreach queue</div>
            <div className="text-xs text-slate-500">{stats.pendingDrafts} emails pending review</div>
          </div>
        </a>
        <a href="/map" className="card card-accent p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">View fire zone map</div>
            <div className="text-xs text-slate-500">{stats.totalLeads} permits in fire zone</div>
          </div>
        </a>
      </div>
    </div>
  )
}

function ScoreRing({ score }) {
  const color = score >= 85 ? '#ff6b35' : score >= 75 ? '#ff8f65' : score >= 50 ? '#fbbf24' : '#6b7280'
  const c = 2 * Math.PI * 20
  const o = c - (score / 100) * c
  return (
    <div className="relative w-[52px] h-[52px] flex-shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52" className="score-ring">
        <circle cx="26" cy="26" r="20" fill="none" stroke="#1e2030" strokeWidth="3.5" />
        <circle cx="26" cy="26" r="20" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>{score}</div>
    </div>
  )
}

function StatCard({ label, value, highlight, color }) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

function DamageBadge({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const cls = damage.includes('Destroyed') ? 'badge-destroyed' : damage.includes('Major') ? 'badge-major' : damage.includes('Minor') ? 'badge-minor' : damage.includes('Affected') ? 'badge-affected' : 'badge-nodamage'
  const label = damage.includes('Destroyed') ? 'Destroyed' : damage.includes('Major') ? 'Major' : damage.includes('Minor') ? 'Minor' : damage.includes('Affected') ? 'Affected' : 'No damage'
  return <span className={`badge ${cls}`}>{label}</span>
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
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}
