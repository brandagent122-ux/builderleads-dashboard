'use client'
import { useState, useEffect } from 'react'
import { getAllLeads } from '@/lib/supabase'

export default function AllLeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [dinsFilter, setDinsFilter] = useState('')

  useEffect(() => {
    async function load() {
      const data = await getAllLeads({
        search: search || undefined,
        minScore: minScore ? parseInt(minScore) : undefined,
        dins_damage: dinsFilter || undefined,
      })
      setLeads(data)
      setLoading(false)
    }
    load()
  }, [search, minScore, dinsFilter])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">All Leads</h1>
        <p className="text-sm text-slate-500 mt-1">{leads.length} permits in fire zone</p>
      </div>

      <div className="flex gap-3 mb-6">
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
                  onClick={() => window.location.href = `/leads/${lead.id}`}>
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
