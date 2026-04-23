'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SavedLeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    async function load() {
      const s = localStorage.getItem('bl_saved_leads')
      if (!s) { setLoading(false); return }

      let ids = []
      try { ids = JSON.parse(s) } catch { setLoading(false); return }
      if (!ids.length) { setLoading(false); return }

      setSavedIds(new Set(ids))

      const batchSize = 200
      let allLeads = []
      let allScores = []
      let allOwners = []

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        const [l, sc, o] = await Promise.all([
          supabase.from('leads').select('*').in('id', batch),
          supabase.from('scores').select('lead_id,score,reasoning').in('lead_id', batch),
          supabase.from('owners').select('lead_id,assessor_value,skip_trace_data').in('lead_id', batch),
        ])
        if (l.data) allLeads.push(...l.data)
        if (sc.data) allScores.push(...sc.data)
        if (o.data) allOwners.push(...o.data)
      }

      const scoresMap = {}
      allScores.forEach(s => scoresMap[s.lead_id] = s)
      const ownersMap = {}
      allOwners.forEach(o => ownersMap[o.lead_id] = o)

      const result = allLeads.map(l => {
        const score = scoresMap[l.id] || {}
        const owner = ownersMap[l.id] || {}
        let skip = {}
        try {
          skip = typeof owner.skip_trace_data === 'string' ? JSON.parse(owner.skip_trace_data) : (owner.skip_trace_data || {})
        } catch { skip = {} }

        return {
          id: l.id,
          address: l.address,
          score: score.score || 0,
          permit_type: l.permit_type,
          permit_stage: l.permit_stage,
          estimated_value: l.estimated_value,
          assessor_value: owner.assessor_value || 0,
          sqft: skip.sqft_main || 0,
          beds: skip.beds || 0,
          baths: skip.baths || 0,
          year_built: skip.year_built || 0,
          dins_damage: skip.dins_damage || 'Unknown',
        }
      })

      result.sort((a, b) => b.score - a.score)
      setLeads(result)
      setLoading(false)
    }
    load()
  }, [])

  function removeSaved(id) {
    const next = new Set(savedIds)
    next.delete(id)
    setSavedIds(next)
    setLeads(leads.filter(l => l.id !== id))
    localStorage.setItem('bl_saved_leads', JSON.stringify([...next]))
  }

  function clearAll() {
    setSavedIds(new Set())
    setLeads([])
    localStorage.removeItem('bl_saved_leads')
  }

  function getScoreColor(score) {
    if (score >= 85) return '#FF7A3D'
    if (score >= 75) return '#FF9A6A'
    if (score >= 50) return '#FBBF24'
    return '#555560'
  }

  function DamageTag({ damage }) {
    if (!damage || damage === 'Unknown') return null
    const cls = damage.includes('Destroyed') ? 'tag-destroyed' : damage.includes('Major') ? 'tag-major' : damage.includes('Minor') ? 'tag-minor' : damage.includes('Affected') ? 'tag-affected' : 'tag-nodamage'
    const label = damage.includes('Destroyed') ? 'DESTROYED' : damage.includes('Major') ? 'MAJOR' : damage.includes('Minor') ? 'MINOR' : damage.includes('Affected') ? 'AFFECTED' : 'NO DAMAGE'
    return <span className={`tag ${cls}`}>{label}</span>
  }

  if (loading) {
    return (
      <div className="px-2">
        <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Saved Leads</h1>
        <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">Loading...</p>
        <div className="mt-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20" style={{ borderRadius: 'var(--r-card, 22px)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Saved Leads</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {leads.length} SAVED LEAD{leads.length !== 1 ? 'S' : ''}
          </p>
        </div>
        {leads.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-[12px] font-mono">
            Clear all
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="card-raised p-12 text-center" style={{ borderRadius: 'var(--r-card, 22px)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" className="mx-auto mb-4">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <div className="text-sm text-ink-2 mb-2">No saved leads yet</div>
          <div className="text-xs text-ink-3">Click the star icon on any lead to save it here</div>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.id} className="card-raised p-4 flex items-center gap-4" style={{ borderRadius: 'var(--r-card, 22px)' }}>
              {/* Score ring */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono text-sm font-bold"
                style={{ border: `2px solid ${getScoreColor(lead.score)}`, color: getScoreColor(lead.score) }}>
                {lead.score}
              </div>

              {/* Lead info */}
              <div className="flex-1 min-w-0">
                <a href={`/leads/${lead.id}`} className="text-[15px] font-semibold text-ink-0 hover:text-ember transition-colors no-underline">
                  {lead.address}
                </a>
                <div className="font-mono text-[11px] text-ink-2 mt-1 tracking-wider">
                  {lead.beds > 0 && `${lead.beds}BD `}{lead.baths > 0 && `${lead.baths}BA `}{lead.sqft > 0 && `${lead.sqft.toLocaleString()}SF`}
                  {lead.assessor_value > 0 && ` \u00B7 $${(lead.assessor_value / 1e6).toFixed(1)}M`}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <DamageTag damage={lead.dins_damage} />
                  <span className="tag tag-permit">{lead.permit_type}</span>
                  <span className="tag tag-stage">{lead.permit_stage}</span>
                </div>
              </div>

              {/* Remove button */}
              <button onClick={() => removeSaved(lead.id)} className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--card-sunk)] transition-colors" title="Remove from saved">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--ember)" stroke="var(--ember)" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
