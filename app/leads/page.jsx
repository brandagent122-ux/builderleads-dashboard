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
  const [selected, setSelected] = useState(new Set())
  const [saved, setSaved] = useState(new Set())
  const [sortCol, setSortCol] = useState('score')
  const [sortDir, setSortDir] = useState('desc')
  const router = useRouter()

  useEffect(() => {
    const s = localStorage.getItem('bl_saved_leads')
    if (s) setSaved(new Set(JSON.parse(s)))
  }, [])

  useEffect(() => {
    async function load() {
      const data = await getAllLeads({})

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

      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(l =>
          (l.address || '').toLowerCase().includes(q) ||
          (l.permit_type || '').toLowerCase().includes(q) ||
          (l.permit_stage || '').toLowerCase().includes(q) ||
          (l.dins_damage || '').toLowerCase().includes(q) ||
          String(l.score).includes(q) ||
          String(l.year_built).includes(q)
        )
      }

      if (minScore) filtered = filtered.filter(r => r.score >= parseInt(minScore))
      if (dinsFilter) filtered = filtered.filter(r => r.dins_damage === dinsFilter)

      setLeads(filtered)
      setSelected(new Set())
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [search, minScore, dinsFilter, trade])

  function sortedLeads() {
    return [...leads].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol]
      if (sortCol === 'assessor_value') { av = av || 0; bv = bv || 0 }
      if (sortCol === 'address') { av = av || ''; bv = bv || '' }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0)
    })
  }

  function toggleSort(col) {
    if (sortCol === col) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }
    else { setSortCol(col); setSortDir('desc') }
  }

  function toggleSelect(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  function toggleAll() {
    if (selected.size === displayLeads.length) { setSelected(new Set()) }
    else { setSelected(new Set(displayLeads.map(l => l.id))) }
  }

  function toggleSave(e, id) {
    e.stopPropagation()
    const s = new Set(saved)
    s.has(id) ? s.delete(id) : s.add(id)
    setSaved(s)
    localStorage.setItem('bl_saved_leads', JSON.stringify([...s]))
  }

  function exportCSV() {
    const toExport = leads.filter(l => selected.has(l.id))
    if (toExport.length === 0) return
    const headers = ['Address','Score','Permit Type','Stage','Damage','Beds','Baths','Sqft','Year Built','Assessed Value']
    const rows = toExport.map(l => [
      l.address, l.score, l.permit_type, l.permit_stage, l.dins_damage || '-',
      l.beds || '-', l.baths || '-', l.sqft || '-', l.year_built || '-',
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

  const displayLeads = sortedLeads().slice(0, 100)
  const arrow = (col) => sortCol === col ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            {leads.length} permits{trade !== 'all' ? ` for ${TRADE_PRESETS[trade].label}` : ' in fire zone'}
            {selected.size > 0 && <span className="text-accent ml-2">({selected.size} selected)</span>}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={selected.size === 0}
          className={`text-xs flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${selected.size > 0 ? 'btn-primary' : 'bg-navy-700 text-slate-650 cursor-not-allowed border border-navy-600'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV ({selected.size})
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={trade} onChange={e => { setLoading(true); setTrade(e.target.value) }}
          className="bg-navy-700 border border-navy-500 rounded-lg px-4 py-2.5 text-sm text-accent font-medium focus:outline-none focus:border-accent">
          {Object.entries(TRADE_PRESETS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <input type="text" placeholder="Search address, permit, damage, score..."
          value={search} onChange={e => { setLoading(true); setSearch(e.target.value) }}
          className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-accent" />
        <select value={minScore} onChange={e => { setLoading(true); setMinScore(e.target.value) }}
          className="bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-slate-400 focus:outline-none focus:border-accent">
          <option value="">Min score: Any</option>
          <option value="90">90+</option>
          <option value="80">80+</option>
          <option value="75">75+ (Hot)</option>
          <option value="50">50+</option>
        </select>
        <select value={dinsFilter} onChange={e => { setLoading(true); setDinsFilter(e.target.value) }}
          className="bg-navy-800 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-slate-400 focus:outline-none focus:border-accent">
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
            <span className="font-semibold">{TRADE_PRESETS[trade].label} filter:</span>
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
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selected.size === displayLeads.length && displayLeads.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-accent bg-navy-800 border-navy-500 cursor-pointer" />
                </th>
                <th className="px-3 py-3 w-16 cursor-pointer select-none text-center metric-label" onClick={() => toggleSort('score')}>
                  Score{arrow('score')}
                </th>
                <th className="text-left px-4 py-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('address')}>
                  Address{arrow('address')}
                </th>
                <th className="text-left px-4 py-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('permit_type')}>
                  Permit{arrow('permit_type')}
                </th>
                <th className="text-left px-4 py-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('permit_stage')}>
                  Stage{arrow('permit_stage')}
                </th>
                <th className="text-left px-4 py-3 metric-label">Damage</th>
                <th className="text-right px-4 py-3 metric-label cursor-pointer select-none" onClick={() => toggleSort('assessor_value')}>
                  Value{arrow('assessor_value')}
                </th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {displayLeads.map(lead => (
                <tr key={lead.id}
                  className={`border-b border-navy-700 hover:bg-navy-700 cursor-pointer transition-colors ${selected.has(lead.id) ? 'bg-navy-700/50' : ''}`}
                  onClick={() => router.push(`/leads/${lead.id}`)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-4 h-4 rounded accent-accent bg-navy-800 border-navy-500 cursor-pointer" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent font-bold text-navy-950 text-sm">
                      {lead.score}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{lead.address}</div>
                    <div className="text-xs text-slate-650 mt-0.5">
                      {lead.beds > 0 && `${lead.beds}bd `}{lead.baths > 0 && `${lead.baths}ba `}{lead.sqft > 0 && `${lead.sqft.toLocaleString()}sf`}
                      {lead.year_built > 0 && ` / ${lead.year_built}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{lead.permit_type}</td>
                  <td className="px-4 py-3 text-slate-400">{lead.permit_stage}</td>
                  <td className="px-4 py-3"><DamagePill damage={lead.dins_damage} /></td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {lead.assessor_value > 0 ? `$${(lead.assessor_value / 1e6).toFixed(1)}M` : '-'}
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={e => toggleSave(e, lead.id)} className="p-1 hover:scale-110 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill={saved.has(lead.id) ? '#ff6b35' : 'none'}
                        stroke={saved.has(lead.id) ? '#ff6b35' : '#4a4d63'}
                        strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 100 && (
            <div className="text-center py-4 text-xs text-slate-650">Showing 100 of {leads.length} leads</div>
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
