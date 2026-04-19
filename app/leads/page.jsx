'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllLeads } from '@/lib/supabase'

const TRADE_PRESETS = {
  all: { label: 'All trades', permit_types: null, dins: null, stages: null },
  hvac: { label: 'HVAC', permit_types: ['Bldg-New','Bldg-Addition'], dins: ['Destroyed (>50%)','Major (26-50%)'], stages: ['Issued','Plan Check'] },
  plumbing: { label: 'Plumbing', permit_types: ['Bldg-New','Bldg-Addition'], dins: ['Destroyed (>50%)','Major (26-50%)'], stages: ['Issued','Plan Check'] },
  electrical: { label: 'Electrical', permit_types: ['Bldg-New','Bldg-Addition'], dins: ['Destroyed (>50%)','Major (26-50%)'], stages: ['Issued','Plan Check'] },
  roofing: { label: 'Roofing', permit_types: ['Bldg-New','Bldg-Alter/Repair'], dins: ['Destroyed (>50%)','Major (26-50%)','Minor (10-25%)'], stages: ['Issued'] },
  solar: { label: 'Solar', permit_types: ['Bldg-New'], dins: null, stages: ['Issued','Permit Finaled'] },
  gc: { label: 'General contractor', permit_types: ['Bldg-New'], dins: ['Destroyed (>50%)'], stages: ['Issued','Plan Check'] },
  landscape: { label: 'Landscape / pool', permit_types: ['Bldg-New','Swimming-Pool/Spa'], dins: null, stages: ['Issued'] },
  adjuster: { label: 'Public adjuster', permit_types: null, dins: ['Destroyed (>50%)','Major (26-50%)'], stages: null },
  lender: { label: 'Construction lender', permit_types: ['Bldg-New'], dins: ['Destroyed (>50%)'], stages: ['Issued','Plan Check'] },
  architect: { label: 'Architect / engineer', permit_types: ['Bldg-New','Grading'], dins: ['Destroyed (>50%)'], stages: ['Plan Check','Issued'] },
}

export default function AllLeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [dinsFilter, setDinsFilter] = useState('')
  const [trade, setTrade] = useState('all')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const data = await getAllLeads({
        search: search || undefined,
        minScore: minScore ? parseInt(minScore) : undefined,
        dins_damage: dinsFilter || undefined,
      })

      const preset = TRADE_PRESETS[trade]
      let filtered = data

      if (preset && preset.permit_types) {
        filtered = filtered.filter(l => preset.permit_types.some(pt => l.permit_type?.includes(pt)))
      }
      if (preset && preset.dins) {
        filtered = filtered.filter(l => preset.dins.some(d => l.dins_damage?.includes(d)))
      }
      if (preset && preset.stages) {
        filtered = filtered.filter(l => preset.stages.some(s => l.permit_stage?.includes(s)))
      }

      setLeads(filtered)
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [search, minScore, dinsFilter, trade])

  function exportCSV() {
    const headers = ['Address','Score','Permit Type','Stage','Damage','Beds','Baths','Sqft','Year Built','Assessed Value']
    const rows = leads.map(l => [
      l.address,
      l.score,
      l.permit_type,
      l.permit_stage,
      l.dins_damage || '-',
      l.beds || '-',
      l.baths || '-',
      l.sqft || '-',
      l.year_built || '-',
      l.assessor_value ? `$${(l.assessor_value / 1e6).toFixed(2)}M` : '-',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `builderleads_${trade}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Leads</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} permits{trade !== 'all' ? ` for ${TRADE_PRESETS[trade].label}` : ' in fire zone'}</p>
        </div>
        <button onClick={exportCSV} disabled={leads.length === 0} className="btn-secondary text-xs flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={trade}
          onChange={e => { setLoading(true); setTrade(e.target.value) }}
          className="bg-accent/15 border border-accent/30 rounded-lg px-4 py-2.5 text-sm text-accent font-medium focus:outline-none focus:border-accent"
        >
          {Object.entries(TRADE_PRESETS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by address..."
          value={search}
          onChange={e => { setLoading(true); setSearch(e.target.value) }}
          className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-accent"
        />
        <select
          value={minScore}
          onChange={e => { setLoading(true); setMinScore(e.target.value) }}
          className="bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-slate-400 focus:outline-none focus:border-accent"
        >
          <option value="">Min score: Any</option>
          <option value="90">90+</option>
          <option value="80">80+</option>
          <option value="75">75+ (Hot)</option>
          <option value="50">50+</option>
        </select>
        <select
          value={dinsFilter}
          onChange={e => { setLoading(true); setDinsFilter(e.target.value) }}
          className="bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-slate-400 focus:outline-none focus:border-accent"
        >
          <option value="">Damage: All</option>
          <option value="Destroyed (>50%)">Destroyed</option>
          <option value="Major (26-50%)">Major</option>
          <option value="Minor (10-25%)">Minor</option>
          <option value="Affected (1-9%)">Affected</option>
          <option value="No Damage">No damage</option>
        </select>
      </div>

      {trade !== 'all' && (
        <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2 text-xs text-accent">
            <span className="font-semibold">{TRADE_PRESETS[trade].label} filter active:</span>
            {TRADE_PRESETS[trade].permit_types && <span>Permits: {TRADE_PRESETS[trade].permit_types.join(', ')}</span>}
            {TRADE_PRESETS[trade].dins && <span>| Damage: {TRADE_PRESETS[trade].dins.map(d => d.split(' ')[0]).join(', ')}</span>}
            {TRADE_PRESETS[trade].stages && <span>| Stage: {TRADE_PRESETS[trade].stages.join(', ')}</span>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-accent animate-pulse text-sm">Loading leads...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600">
                <th className="text-left px-4 py-3 metric-label">Address</th>
                <th className="text-left px-4 py-3 metric-label">Permit</th>
                <th className="text-left px-4 py-3 metric-label">Stage</th>
                <th className="text-left px-4 py-3 metric-label">Damage</th>
                <th className="text-right px-4 py-3 metric-label">Score</th>
                <th className="text-right px-4 py-3 metric-label">Value</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 100).map(lead => (
                <tr key={lead.id} className="border-b border-navy-700 hover:bg-navy-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/leads/${lead.id}`)}>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{lead.address}</div>
                    <div className="text-xs text-slate-650 mt-0.5">
                      {lead.beds > 0 && `${lead.beds}bd`} {lead.baths > 0 && `${lead.baths}ba`} {lead.sqft > 0 && `${lead.sqft.toLocaleString()}sf`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{lead.permit_type}</td>
                  <td className="px-4 py-3 text-slate-400">{lead.permit_stage}</td>
                  <td className="px-4 py-3">
                    <DamagePill damage={lead.dins_damage} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold font-mono" style={{ color: lead.score >= 75 ? '#ff6b35' : lead.score >= 50 ? '#fbbf24' : '#6b7280' }}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {lead.assessor_value > 0 ? `$${(lead.assessor_value / 1e6).toFixed(1)}M` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 100 && (
            <div className="text-center py-4 text-xs text-slate-650">
              Showing 100 of {leads.length} leads
            </div>
          )}
          {leads.length === 0 && (
            <div className="text-center py-12 text-slate-650">No leads match your filters</div>
          )}
        </div>
      )}
    </div>
  )
}

function DamagePill({ damage }) {
  if (!damage || damage === 'Unknown') return <span className="text-slate-650 text-xs">-</span>
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
