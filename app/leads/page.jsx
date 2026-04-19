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
      if (preset?.permit_types) filtered = filtered.filter(l => preset.permit_types.some(pt => l.permit_type?.includes(pt)))
      if (preset?.dins) filtered = filtered.filter(l => preset.dins.some(d => l.dins_damage?.includes(d)))
      if (preset?.stages) filtered = filtered.filter(l => preset.stages.some(s => l.permit_stage?.includes(s)))
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(l =>
          (l.address || '').toLowerCase().includes(q) || (l.permit_type || '').toLowerCase().includes(q) ||
          (l.permit_stage || '').toLowerCase().includes(q) || (l.dins_damage || '').toLowerCase().includes(q) ||
          String(l.score).includes(q) || String(l.year_built).includes(q))
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
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function toggleSelect(id) { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s) }
  function toggleAll() { selected.size === displayLeads.length ? setSelected(new Set()) : setSelected(new Set(displayLeads.map(l => l.id))) }

  function toggleSave(e, id) {
    e.stopPropagation()
    const s = new Set(saved); s.has(id) ? s.delete(id) : s.add(id); setSaved(s)
    localStorage.setItem('bl_saved_leads', JSON.stringify([...s]))
  }

  function exportCSV() {
    const toExport = leads.filter(l => selected.has(l.id))
    if (!toExport.length) return
    const headers = ['Address','Score','Permit Type','Stage','Damage','Beds','Baths','Sqft','Year Built','Assessed Value']
    const rows = toExport.map(l => [l.address, l.score, l.permit_type, l.permit_stage, l.dins_damage || '-', l.beds || '-', l.baths || '-', l.sqft || '-', l.year_built || '-', l.assessor_value ? `$${(l.assessor_value / 1e6).toFixed(2)}M` : '-'])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `builderleads_${trade}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const displayLeads = sortedLeads().slice(0, 100)
  const arrow = (col) => sortCol === col ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">All Leads</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {leads.length} LEADS{trade !== 'all' ? ` \u00B7 ${TRADE_PRESETS[trade].label.toUpperCase()}` : ' \u00B7 FIRE ZONE'}
            {selected.size > 0 && <span className="text-ember ml-2">({selected.size} SELECTED)</span>}
          </p>
        </div>
        <button onClick={exportCSV} disabled={selected.size === 0}
          className={selected.size > 0 ? 'btn-ember flex items-center gap-2' : 'btn-ghost flex items-center gap-2 opacity-50 cursor-not-allowed'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV ({selected.size})
        </button>
      </div>

      {/* Neumorphic filter bar */}
      <div className="card-raised p-3 flex gap-3 mb-6" style={{ borderRadius: 18 }}>
        <select value={trade} onChange={e => { setLoading(true); setTrade(e.target.value) }}
          className="input-sunk text-[13px] text-ember font-medium px-4" style={{ minWidth: 140 }}>
          {Object.entries(TRADE_PRESETS).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
        </select>
        <div className="flex-1 relative">
          <input type="text" placeholder="Search address, permit, damage, score..."
            value={search} onChange={e => { setLoading(true); setSearch(e.target.value) }}
            className="input-sunk w-full text-sm pl-10" />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <select value={minScore} onChange={e => { setLoading(true); setMinScore(e.target.value) }}
          className="input-sunk text-[13px] px-4 pr-9" style={{ minWidth: 130 }}>
          <option value="">Min score: Any</option>
          <option value="90">90+</option><option value="80">80+</option>
          <option value="75">75+ (Hot)</option><option value="50">50+</option>
        </select>
        <select value={dinsFilter} onChange={e => { setLoading(true); setDinsFilter(e.target.value) }}
          className="input-sunk text-[13px] px-4 pr-9" style={{ minWidth: 130 }}>
          <option value="">Damage: All</option>
          <option value="Destroyed (>50%)">Destroyed</option><option value="Major (26-50%)">Major</option>
          <option value="Minor (10-25%)">Minor</option><option value="Affected (1-9%)">Affected</option>
          <option value="No Damage">No damage</option>
        </select>
      </div>

      {trade !== 'all' && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--ember-wash)', border: '1px solid rgba(255,122,61,0.15)' }}>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ember tracking-wider">
            <span className="font-semibold">{TRADE_PRESETS[trade].label.toUpperCase()} FILTER:</span>
            {TRADE_PRESETS[trade].permit_types && <span>Permits: {TRADE_PRESETS[trade].permit_types.join(', ')}</span>}
            {TRADE_PRESETS[trade].dins && <span>| Damage: {TRADE_PRESETS[trade].dins.map(d => d.split(' ')[0]).join(', ')}</span>}
            {TRADE_PRESETS[trade].stages && <span>| Stage: {TRADE_PRESETS[trade].stages.join(', ')}</span>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20" style={{ borderRadius: 'var(--r-card)' }} />)}
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-3 mb-1">
            <div className="w-5">
              <input type="checkbox" checked={selected.size === displayLeads.length && displayLeads.length > 0}
                onChange={toggleAll} className="w-4 h-4 rounded accent-ember cursor-pointer" />
            </div>
            <div className="w-12 font-mono text-[12px] text-ink-2 tracking-wider cursor-pointer select-none text-center" onClick={() => toggleSort('score')}>SCORE{arrow('score')}</div>
            <div className="flex-1 font-mono text-[12px] text-ink-2 tracking-wider cursor-pointer select-none" onClick={() => toggleSort('address')}>ADDRESS{arrow('address')}</div>
            <div className="w-28 font-mono text-[12px] text-ink-2 tracking-wider cursor-pointer select-none" onClick={() => toggleSort('permit_type')}>PERMIT{arrow('permit_type')}</div>
            <div className="w-24 font-mono text-[12px] text-ink-2 tracking-wider cursor-pointer select-none" onClick={() => toggleSort('permit_stage')}>STAGE{arrow('permit_stage')}</div>
            <div className="w-24 font-mono text-[12px] text-ink-2 tracking-wider">DAMAGE</div>
            <div className="w-20 font-mono text-[12px] text-ink-2 tracking-wider text-right cursor-pointer select-none" onClick={() => toggleSort('assessor_value')}>VALUE{arrow('assessor_value')}</div>
            <div className="w-8" />
          </div>

          {/* Lead rows as cards */}
          <div className="flex flex-col gap-2">
            {displayLeads.map(lead => (
              <div key={lead.id}
                className={`card-raised card-hover flex items-center gap-4 px-4 py-3 cursor-pointer ${selected.has(lead.id) ? 'lead-new' : ''}`}
                onClick={() => router.push(`/leads/${lead.id}`)}>
                <div className="w-5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                    className="w-4 h-4 rounded accent-ember cursor-pointer" />
                </div>
                <div className="w-12 flex justify-center">
                  <ScoreChip score={lead.score} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-ink-0">{lead.address}</div>
                  <div className="font-mono text-[12px] text-ink-2 mt-0.5 tracking-wider">
                    {lead.beds > 0 && `${lead.beds}BD`} {lead.baths > 0 && `${lead.baths}BA`} {lead.sqft > 0 && `${lead.sqft.toLocaleString()}SF`} {lead.year_built > 0 && `/ ${lead.year_built}`}
                  </div>
                </div>
                <div className="w-28 font-mono text-[12px] text-ink-2">{lead.permit_type}</div>
                <div className="w-24 font-mono text-[12px] text-ink-2">{lead.permit_stage}</div>
                <div className="w-24"><DamageTag damage={lead.dins_damage} /></div>
                <div className="w-20 font-mono text-[13px] text-ink-1 text-right font-medium">
                  {lead.assessor_value > 0 ? `$${(lead.assessor_value / 1e6).toFixed(1)}M` : '-'}
                </div>
                <div className="w-8" onClick={e => e.stopPropagation()}>
                  <button onClick={e => toggleSave(e, lead.id)} className="p-1 hover:scale-110 transition-transform">
                    <svg width="15" height="15" viewBox="0 0 24 24"
                      fill={saved.has(lead.id) ? 'var(--ember)' : 'none'}
                      stroke={saved.has(lead.id) ? 'var(--ember)' : 'var(--ink-3)'}
                      strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {leads.length > 100 && <div className="text-center py-4 font-mono text-[12px] text-ink-2">SHOWING 100 OF {leads.length} LEADS</div>}
          {leads.length === 0 && <div className="text-center py-12 text-ink-3">No leads match your filters</div>}
        </>
      )}
    </div>
  )
}

function ScoreChip({ score }) {
  const color = score >= 85 ? 'var(--ember)' : score >= 75 ? 'var(--ember-hi)' : score >= 50 ? 'var(--amber)' : 'var(--ink-3)'
  const c = 2 * Math.PI * 14, o = c - (score / 100) * c
  return (
    <div className="relative w-9 h-9">
      <svg width="36" height="36" viewBox="0 0 36 36" className="score-ring">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--card-sunk)" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold" style={{ color }}>{score}</div>
    </div>
  )
}

function DamageTag({ damage }) {
  if (!damage || damage === 'Unknown') return <span className="font-mono text-[12px] text-ink-2">-</span>
  const cls = damage.includes('Destroyed') ? 'tag-destroyed' : damage.includes('Major') ? 'tag-major' : damage.includes('Minor') ? 'tag-minor' : damage.includes('Affected') ? 'tag-affected' : 'tag-nodamage'
  const label = damage.includes('Destroyed') ? 'DESTROYED' : damage.includes('Major') ? 'MAJOR' : damage.includes('Minor') ? 'MINOR' : damage.includes('Affected') ? 'AFFECTED' : 'NO DAMAGE'
  return <span className={`tag ${cls}`}>{label}</span>
}
