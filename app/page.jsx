'use client'
import { useState, useEffect } from 'react'
import { getStats, getTopLeads, getUserContext, getActiveMarket } from '@/lib/supabase'
import { getTradeConfig } from '@/lib/tradeConfig'
import { logActivity } from '@/lib/activity'

export default function CommandCenter() {
  const [stats, setStats] = useState(null)
  const [topLeads, setTopLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [tradeConfig, setTradeConfig] = useState(getTradeConfig('gc'))
  const [isFireMarket, setIsFireMarket] = useState(true)
  const [marketName, setMarketName] = useState('')

  async function loadData() {
    const ctx = await getUserContext()
    if (!ctx) { setLoading(false); return }

    const userTrade = ctx.profile?.trade || 'gc'
    const tc = getTradeConfig(userTrade)
    setTradeConfig(tc)

    const market = ctx.isAdmin ? getActiveMarket() : null

    // Fetch data first
    const [s, leads, marketsResp] = await Promise.all([
      getStats(ctx.assignedLeadIds, market, userTrade),
      getTopLeads(10, ctx.assignedLeadIds, market, userTrade),
      fetch('/api/markets').then(r => r.json()).catch(() => ({ markets: [] })),
    ])
    setStats(s)
    setTopLeads(leads)

    // Determine fire vs general market
    const markets = marketsResp.markets || []
    if (ctx.isAdmin && market && market !== 'all') {
      const m = markets.find(mk => mk.slug === market)
      setIsFireMarket(m?.fire_filter === true)
      setMarketName(m?.name || market)
    } else if (ctx.assignedLeadIds) {
      // Client user: check their actual leads for fire indicators
      const hasFireLeads = leads.some(l => l.fire_zone_match || (l.dins_damage && l.dins_damage !== 'Unknown' && l.dins_damage !== 'No Damage'))
      setIsFireMarket(hasFireLeads)
      setMarketName('Your territory')
    } else {
      // Admin on "all markets"
      setIsFireMarket(true)
      setMarketName('All Markets')
    }
    setTopLeads(leads)
    setLoading(false)
    logActivity('command_center_viewed', market || 'all')
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const onMarketChange = () => { setLoading(true); loadData() }
    window.addEventListener('market-changed', onMarketChange)
    return () => window.removeEventListener('market-changed', onMarketChange)
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="skeleton h-8 w-64 mb-2" style={{ borderRadius: 8 }} />
        <div className="skeleton h-4 w-96 mb-8" style={{ borderRadius: 6 }} />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" style={{ borderRadius: 'var(--r-card, 22px)' }} />)}
        </div>
        <div className="skeleton h-6 w-48 mb-4" style={{ borderRadius: 6 }} />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 mb-2" style={{ borderRadius: 'var(--r-card, 22px)' }} />)}
      </div>
    )
  }

  // Build KPIs based on market type and trade
  const kpiData = buildKPIs(stats, tradeConfig, isFireMarket)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          {tradeConfig.subtitle}
          {marketName && <span className="text-slate-600"> / {marketName}</span>}
        </p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpiData.map((kpi, i) => (
          <div key={i} className="card-raised p-5" style={{ borderRadius: 'var(--r-card, 22px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <KPIIcon type={kpi.icon} />
              <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            {kpi.sub && <div className="font-mono text-[10px] text-slate-600 mt-1">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {tradeConfig.quickActions.map((action, i) => (
          <a key={i} href={action.href} className="card-raised card-hover p-5 flex items-center gap-4" style={{ borderRadius: 'var(--r-card, 22px)', textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,122,61,0.08)' }}>
              <QuickIcon type={action.icon} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{action.label}</div>
              <div className="font-mono text-[10px] text-slate-500 tracking-wider mt-0.5">{action.sub}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Top Leads */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">{tradeConfig.topLeadsLabel}</h2>
        <p className="text-sm text-slate-500 mt-0.5">Top 10 by score, deduplicated by address</p>
      </div>

      {topLeads.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No scored leads yet for this market</div>
      ) : (
        <div className="flex flex-col gap-2">
          {dedupeByAddress(topLeads).slice(0, 10).map((lead, i) => {
            const scoreColor = lead.score >= 85 ? '#FF7A3D' : lead.score >= 75 ? '#FF9A6A' : lead.score >= 50 ? '#FBBF24' : '#555560'
            return (
              <a key={lead.id} href={`/leads/${lead.id}`} className="card-raised card-hover flex items-center gap-4 px-5 py-3" style={{ borderRadius: 'var(--r-card, 22px)', textDecoration: 'none' }}>
                <div className="font-mono text-[11px] text-slate-600 w-5">{i + 1}</div>
                <ScoreRing score={lead.score} color={scoreColor} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-white truncate">{lead.address}</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {lead.permit_type} / {lead.permit_stage}
                    {lead.sqft > 0 && ` / ${lead.sqft.toLocaleString()} sqft`}
                    {lead.year_built > 0 && ` / ${lead.year_built}`}
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                  {isFireMarket && lead.dins_damage && lead.dins_damage !== 'Unknown' && (
                    <DamageTag damage={lead.dins_damage} />
                  )}
                  {!isFireMarket && lead.permit_type && (
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: '#3b82f612', color: '#60a5fa', border: '1px solid #3b82f618' }}>{lead.permit_type}</span>
                  )}
                  {lead.assessor_value > 0 && (
                    <span className="font-mono text-[11px] text-slate-500">${(lead.assessor_value / 1e6).toFixed(1)}M</span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ───

function buildKPIs(stats, tc, isFireMarket) {
  if (!stats) return tc.kpiLabels.map((label, i) => ({ label, value: '-', icon: tc.kpiIcons[i], sub: tc.kpiSubs[i] }))

  const formatValue = (v) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    return `$${v}`
  }

  // For fire markets, use trade config KPIs as-is
  if (isFireMarket) {
    return tc.kpiLabels.map((label, i) => {
      const key = tc.kpiKeys[i]
      let value = stats[key] || 0
      if (key === 'rebuildValue') value = formatValue(value)
      else value = value.toLocaleString()
      return { label, value, icon: tc.kpiIcons[i], sub: tc.kpiSubs[i] }
    })
  }

  // For general markets, override fire-specific KPIs
  return [
    { label: 'Total Leads', value: (stats.totalLeads || 0).toLocaleString(), icon: 'layers', sub: 'Active permits' },
    { label: 'Hot 75+', value: (stats.hotLeads || 0).toLocaleString(), icon: 'flame', sub: 'High-value projects' },
    { label: 'New Construction', value: (stats.destroyed || 0).toLocaleString(), icon: 'build', sub: 'Bldg-New permits' },
    { label: 'Total Permit Value', value: formatValue(stats.rebuildValue || 0), icon: 'dollar', sub: 'Assessed pipeline' },
  ]
}

function dedupeByAddress(leads) {
  const seen = new Set()
  return leads.filter(l => {
    if (seen.has(l.address)) return false
    seen.add(l.address)
    return true
  })
}

function ScoreRing({ score, color }) {
  const c = 2 * Math.PI * 19
  const o = c - (score / 100) * c
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold" style={{ color }}>{score}</div>
    </div>
  )
}

function DamageTag({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const isDestroyed = damage.includes('Destroyed')
  const isMajor = damage.includes('Major')
  const isMinor = damage.includes('Minor')
  const label = isDestroyed ? 'DESTROYED' : isMajor ? 'MAJOR' : isMinor ? 'MINOR' : 'AFFECTED'
  const bg = isDestroyed ? '#f8717112' : isMajor ? '#fbbf2412' : '#4ade8012'
  const color = isDestroyed ? '#f87171' : isMajor ? '#fbbf24' : '#4ade80'
  return <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: bg, color, border: `1px solid ${color}18` }}>{label}</span>
}

function KPIIcon({ type }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--ember, #FF7A3D)', strokeWidth: 2 }
  switch (type) {
    case 'layers': return <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    case 'flame': return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    case 'alert': return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case 'dollar': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'build': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>
    default: return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>
  }
}

function QuickIcon({ type }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: '#FF7A3D', strokeWidth: 2 }
  switch (type) {
    case 'mail': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    case 'map': return <svg {...props}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
    default: return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>
  }
}
