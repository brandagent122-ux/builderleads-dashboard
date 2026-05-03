'use client'
import { useState, useEffect } from 'react'
import UnlockButton from '@/components/UnlockButton'
import DraftOutreachButton from '@/components/DraftOutreachButton'
import NotesPanel from '@/components/NotesPanel'
import StreetView from '@/components/StreetView'
import { useParams } from 'next/navigation'
import { getLeadDetail, updateDraftStatus, getUserContext } from '@/lib/supabase'
import { getTradeConfig } from '@/lib/tradeConfig'
import { logActivity } from '@/lib/activity'

export default function LeadDetailPage() {
  const params = useParams()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [trade, setTrade] = useState('gc')

  useEffect(() => {
    const s = localStorage.getItem('bl_saved_leads')
    if (s) {
      const set = new Set(JSON.parse(s))
      setSaved(set.has(parseInt(params.id)))
    }

    async function load() {
      const ctx = await getUserContext()
      if (!ctx) { setLead(null); setLoading(false); return }
      const ids = ctx.assignedLeadIds
      setTrade(ctx.profile?.trade || 'gc')
      const data = await getLeadDetail(params.id, ids)
      if (!data || !data.id) {
        setLead(null)
        setLoading(false)
        return
      }
      setLead(data)
      setLoading(false)
      logActivity('lead_viewed', data.address, parseInt(params.id))
    }
    load()
  }, [params.id])

  function toggleSave() {
    const s = localStorage.getItem('bl_saved_leads')
    const set = s ? new Set(JSON.parse(s)) : new Set()
    const id = parseInt(params.id)
    if (set.has(id)) { set.delete(id); setSaved(false); logActivity('lead_unsaved', lead?.address, id) }
    else { set.add(id); setSaved(true); logActivity('lead_saved', lead?.address, id) }
    localStorage.setItem('bl_saved_leads', JSON.stringify([...set]))
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-accent animate-pulse text-sm">Loading lead...</div></div>
  if (!lead) return <div className="p-8 text-slate-500">Lead not found</div>

  const tc = getTradeConfig(trade)
  const isEnviro = trade === 'enviro'
  const scoreColor = lead.score >= 85 ? tc.color : lead.score >= 75 ? tc.color : lead.score >= 50 ? '#fbbf24' : '#6b7280'
  const totalPermits = 1 + (lead.stackedPermits?.length || 0)

  // Enviro helpers
  const yearBuilt = lead.year_built || 0
  const isPre1978 = yearBuilt > 0 && yearBuilt < 1978
  const riskLevel = yearBuilt <= 0 ? 'Unknown' : yearBuilt < 1950 ? 'VERY HIGH' : yearBuilt < 1970 ? 'HIGH' : yearBuilt < 1978 ? 'HIGH' : yearBuilt < 1986 ? 'MODERATE' : 'LOW'
  const riskColor = riskLevel === 'VERY HIGH' || riskLevel === 'HIGH' ? '#FF4444' : riskLevel === 'MODERATE' ? '#FFaa33' : '#666'
  const desc = (lead.permit_description || '').toLowerCase()

  // Hazmat materials prediction based on year built
  function getHazmatMaterials() {
    if (yearBuilt <= 0) return []
    const materials = []
    if (yearBuilt < 1978) materials.push({ level: 'high', name: 'Lead paint on interior and exterior surfaces' })
    if (yearBuilt < 1980) materials.push({ level: 'high', name: 'Popcorn/textured ceilings with asbestos' })
    if (yearBuilt < 1975) materials.push({ level: 'high', name: '9x9 vinyl floor tiles with asbestos backing' })
    if (yearBuilt < 1970) materials.push({ level: 'high', name: 'Pipe insulation wrap (asbestos)' })
    if (yearBuilt < 1960) materials.push({ level: 'high', name: 'Asbestos in plaster walls and joint compound' })
    if (yearBuilt < 1970) materials.push({ level: 'med', name: 'Vermiculite attic insulation' })
    if (yearBuilt < 1975) materials.push({ level: 'med', name: 'HVAC duct tape and insulation' })
    if (yearBuilt < 1950) materials.push({ level: 'med', name: 'Knob-and-tube wiring with asbestos cloth' })
    if (yearBuilt < 1960) materials.push({ level: 'low', name: 'Asbestos cement siding (transite)' })
    return materials
  }

  // Scope flags from permit description
  function getScopeFlags() {
    const flags = []
    if (desc.includes('flooring') || desc.includes('floor tile')) flags.push('Remove existing flooring -- asbestos tile trigger')
    if (desc.includes('drywall') || desc.includes('plaster')) flags.push('Remove drywall/plaster -- joint compound trigger')
    if (desc.includes('ceiling') || desc.includes('popcorn')) flags.push('Ceiling work -- popcorn/texture asbestos trigger')
    if (desc.includes('demo') || desc.includes('demolition')) flags.push('Demolition -- full hazmat survey required')
    if (desc.includes('kitchen')) flags.push('Kitchen remodel -- floor tiles, cabinets, lead paint')
    if (desc.includes('bathroom') || desc.includes('bath')) flags.push('Bathroom remodel -- tiles, pipe insulation')
    if (desc.includes('insulation') || desc.includes('re-insulate')) flags.push('Insulation removal -- asbestos insulation trigger')
    if (desc.includes('window')) flags.push('Window replacement -- glazing putty, asbestos caulk')
    if (desc.includes('reroof') || desc.includes('roofing')) flags.push('Reroofing -- old roofing felt may contain asbestos')
    if (desc.includes('pipe') || desc.includes('plumbing')) flags.push('Plumbing work -- pipe insulation disturbance')
    if (!hasPriorRoofing && isPre1978) flags.push('No roofing permit on record -- original roof materials likely contain asbestos')
    if (!hasPriorAbatement && isPre1978) flags.push('No prior abatement -- all original hazardous materials likely intact')
    if (flags.length === 0 && isPre1978) flags.push('Pre-1978 renovation -- testing recommended for any material disturbance')
    return flags
  }

  // Job estimate based on sqft + year
  function getJobEstimate() {
    const sqft = lead.sqft || 0
    if (yearBuilt <= 0) return { survey: '$300-700', abatement: 'TBD' }
    if (sqft <= 0) return { survey: '$300-700', abatement: yearBuilt < 1960 ? '$5,000-25,000' : '$3,000-15,000' }
    if (yearBuilt < 1950) {
      if (sqft < 1500) return { survey: '$400-600', abatement: '$3,000-8,000' }
      if (sqft < 3000) return { survey: '$500-800', abatement: '$8,000-18,000' }
      if (sqft < 5000) return { survey: '$600-1,000', abatement: '$15,000-30,000' }
      return { survey: '$800-1,200', abatement: '$25,000-50,000+' }
    }
    if (yearBuilt < 1970) {
      if (sqft < 1500) return { survey: '$350-550', abatement: '$2,000-6,000' }
      if (sqft < 3000) return { survey: '$400-700', abatement: '$5,000-12,000' }
      if (sqft < 5000) return { survey: '$500-900', abatement: '$10,000-22,000' }
      return { survey: '$700-1,100', abatement: '$18,000-35,000' }
    }
    if (yearBuilt < 1978) {
      if (sqft < 1500) return { survey: '$300-500', abatement: '$1,500-4,000' }
      if (sqft < 3000) return { survey: '$350-600', abatement: '$3,000-8,000' }
      return { survey: '$400-700', abatement: '$6,000-15,000' }
    }
    return { survey: '$300-500', abatement: '$1,000-5,000' }
  }

  // Mold risk calculation (months since Palisades fire Jan 7, 2025)
  const FIRE_DATE = new Date('2025-01-07')
  const monthsSinceFire = Math.floor((new Date() - FIRE_DATE) / (1000 * 60 * 60 * 24 * 30))
  const isFireDamaged = lead.fire_zone_match && lead.dins_damage && (lead.dins_damage.includes('Destroyed') || lead.dins_damage.includes('Major'))
  const moldRisk = isFireDamaged && monthsSinceFire > 3 ? (monthsSinceFire > 12 ? 'VERY HIGH' : monthsSinceFire > 6 ? 'HIGH' : 'MODERATE') : null
  const moldColor = moldRisk === 'VERY HIGH' ? '#FF4444' : moldRisk === 'HIGH' ? '#FF6644' : '#FFaa33'

  // Permit history (from owners table, populated by permit history agent)
  const hasPriorAbatement = lead.has_prior_abatement || false
  const hasPriorRoofing = lead.has_prior_roofing || false
  const priorAbatementDate = lead.prior_abatement_date || null
  const priorRoofingDate = lead.prior_roofing_date || null
  const totalHistoricalPermits = lead.total_historical_permits || 0

  const hazmatMaterials = isEnviro ? getHazmatMaterials() : []
  const scopeFlags = isEnviro ? getScopeFlags() : []
  const jobEstimate = isEnviro ? getJobEstimate() : {}

  return (
    <div className="p-8 max-w-6xl">
      <a href="/leads" className="text-sm text-slate-500 hover:text-accent transition-colors mb-4 inline-block">&larr; Back to all leads</a>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{lead.address}</h1>
            <button onClick={toggleSave} className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors" title={saved ? 'Remove from saved' : 'Save lead'}>
              <svg width="22" height="22" viewBox="0 0 24 24"
                fill={saved ? tc.color : 'none'}
                stroke={saved ? tc.color : '#4a4d63'}
                strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
            <button
              onClick={() => { window.open(`/leads/${params.id}/print`, '_blank'); logActivity('lead_printed', lead?.address, parseInt(params.id)) }}
              className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
              title="Export / Print lead report"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a4d63" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
            <DraftOutreachButton leadId={parseInt(params.id)} address={lead.address} />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {lead.fire_zone_match && <DamageBadge damage={lead.dins_damage} />}
            {isEnviro && isPre1978 && (
              <span className="badge" style={{ background: 'rgba(255,68,68,0.12)', color: '#FF4444' }}>PRE-1978</span>
            )}
            {isEnviro && (
              <span className="badge" style={{ background: riskColor + '20', color: riskColor }}>{riskLevel} RISK</span>
            )}
            {isEnviro && moldRisk && (
              <span className="badge" style={{ background: moldColor + '20', color: moldColor }}>MOLD: {moldRisk}</span>
            )}
            <span className="badge badge-permit">{lead.permit_type}</span>
            <span className="badge badge-stage">{lead.permit_stage}</span>
            {totalPermits > 1 && <span className="badge badge-stack">{totalPermits} permits stacked</span>}
            {lead.fire_zone_match && lead.is_perimeter_edge && <span className="badge badge-fire">Perimeter edge</span>}
            {lead.owner_occupied && <span className="badge badge-permit">Owner-occupied</span>}
            {(!lead.contractor_name || lead.contractor_name === 'None listed' || lead.contractor_name === 'Not in public record') && <span className="badge badge-fire">No contractor</span>}
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

      {/* Street View */}
      <div className="mb-6">
        <StreetView latitude={lead.latitude} longitude={lead.longitude} address={lead.address} />
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Hazmat Risk Profile (shows ABOVE property details) */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && hazmatMaterials.length > 0 && (
        <div className="card p-5 mb-6" style={{ border: '1px solid ' + riskColor + '30' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span style={{ color: riskColor }}>&#9763;</span> Hazmat risk profile
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md" style={{ background: riskColor + '20', color: riskColor }}>
              {riskLevel}
            </span>
          </div>

          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-1 font-mono uppercase tracking-wider">Year built</div>
            <div className="text-3xl font-bold" style={{ color: isPre1978 ? riskColor : '#fff' }}>{yearBuilt || 'Unknown'}</div>
          </div>

          <div className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">Likely hazardous materials</div>
          <div className="flex flex-col gap-2 mb-4">
            {hazmatMaterials.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: m.level === 'high' ? '#FF4444' : m.level === 'med' ? '#FFaa33' : '#666',
                }} />
                <span style={{ color: m.level === 'high' ? '#ddd' : m.level === 'med' ? '#bbb' : '#888' }}>{m.name}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Est. test points</div>
              <div className="text-lg font-bold text-white">{hazmatMaterials.length > 6 ? '8-12' : hazmatMaterials.length > 3 ? '4-8' : '2-4'} samples</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Payment source</div>
              <div className="text-sm font-medium" style={{ color: lead.fire_zone_match ? '#00C896' : '#bbb' }}>
                {lead.fire_zone_match ? 'Likely insurance (fire claim)' : 'Out-of-pocket'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Mold Risk Alert (fire-damaged properties) */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && moldRisk && (
        <div className="card p-5 mb-6" style={{ border: '1px solid ' + moldColor + '30' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span style={{ fontSize: 18 }}>&#x1F7E0;</span> Mold risk assessment
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md" style={{ background: moldColor + '20', color: moldColor }}>
              {moldRisk}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Months since fire</div>
              <div className="text-2xl font-bold" style={{ color: moldColor }}>{monthsSinceFire}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Fire damage</div>
              <div className="text-sm font-medium text-white">{lead.dins_damage}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Water exposure</div>
              <div className="text-sm font-medium" style={{ color: moldColor }}>
                {monthsSinceFire > 12 ? 'Extended (16+ months)' : monthsSinceFire > 6 ? 'Prolonged' : 'Recent'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            Fire department water saturation + {monthsSinceFire} months of exposure. Mold remediation likely required as additional scope. Estimate: $5,000-15,000 depending on spread.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Permit History at Address */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && totalHistoricalPermits > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span>&#x1F4C4;</span> Permit history at this address
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Total permits (all time)</div>
              <div className="text-lg font-bold text-white">{totalHistoricalPermits}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Prior abatement</div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium" style={{ color: hasPriorAbatement ? '#FFaa33' : '#00C896' }}>
                  {hasPriorAbatement ? 'Yes' : 'None on record'}
                </div>
              </div>
              {priorAbatementDate && <div className="text-xs text-slate-500 mt-1">{priorAbatementDate}</div>}
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Prior roofing permit</div>
              <div className="text-sm font-medium" style={{ color: hasPriorRoofing ? '#4A9EFF' : '#FF4444' }}>
                {hasPriorRoofing ? 'Yes (roof replaced)' : 'None (original roof)'}
              </div>
              {priorRoofingDate && <div className="text-xs text-slate-500 mt-1">{priorRoofingDate}</div>}
            </div>
          </div>
          {!hasPriorAbatement && isPre1978 && (
            <div className="text-xs text-slate-400 leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
              No prior abatement permits found. Pre-1978 home with original materials intact. Full survey recommended.
            </div>
          )}
          {hasPriorAbatement && (
            <div className="text-xs text-slate-400 leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
              Previous abatement on record. Some areas may already be cleared. Ask homeowner for prior clearance reports before scoping.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Scope Flags */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && scopeFlags.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span style={{ color: '#FFaa33' }}>&#9888;</span> Scope flags
          </h3>
          <div className="flex flex-col gap-2">
            {scopeFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span style={{ color: '#FFaa33', flexShrink: 0, marginTop: 1 }}>&#9888;</span>
                <span className="text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Job Estimate */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && isPre1978 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Job estimate</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Survey</div>
              <div className="text-lg font-bold text-white">{jobEstimate.survey}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Abatement (if positive)</div>
              <div className="text-lg font-bold" style={{ color: tc.color }}>{jobEstimate.abatement}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Property sqft</div>
              <div className="text-lg font-bold text-white">{lead.sqft ? lead.sqft.toLocaleString() : '-'}</div>
            </div>
          </div>
          {lead.fire_zone_match && isPre1978 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Fire-specific additions</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Soil sampling + remediation</div>
                  <div className="text-sm font-medium text-white">$5,000-15,000</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Mold assessment + remediation</div>
                  <div className="text-sm font-medium text-white">$5,000-15,000</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 1: Property Details + Market-specific Intel */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Property details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Bedrooms" value={lead.beds || '-'} />
            <Detail label="Bathrooms" value={lead.baths || '-'} />
            <Detail label="Square feet" value={lead.sqft ? lead.sqft.toLocaleString() : '-'} />
            <Detail label="Year built" value={lead.year_built || '-'} highlight={isEnviro && isPre1978} highlightColor={riskColor} />
            <Detail label="Assessed value" value={lead.assessor_value ? `$${(lead.assessor_value / 1e6).toFixed(2)}M` : '-'} />
            <Detail label="APN" value={lead.apn || '-'} />
            <Detail label="Lot size" value={lead.lot_size_sqft ? `${lead.lot_size_sqft.toLocaleString()} sqft` : '-'} />
            <Detail label="Owner occupied" value={lead.owner_occupied === true ? 'Yes' : lead.owner_occupied === false ? 'No' : '-'} />
          </div>
        </div>

        {lead.fire_zone_match ? (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Fire damage intel</h3>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="DINS classification" value={lead.dins_damage || '-'} />
              <Detail label="Structure type" value={lead.dins_structure_type || '-'} />
              <Detail label="Fire damage flag" value={lead.fire_damage_flag || '-'} />
              <Detail label="Fire zone" value="Inside perimeter" />
              <Detail label="Distance to perimeter" value={lead.fire_zone_distance_ft != null ? `${Math.round(lead.fire_zone_distance_ft)} ft` : '-'} />
              <Detail label="DINS match accuracy" value={lead.dins_match_distance_m != null ? `${Math.round(lead.dins_match_distance_m)}m` : '-'} />
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{isEnviro ? 'Permit trigger' : 'Permit intel'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Permit type" value={lead.permit_type || '-'} />
              <Detail label="Permit stage" value={lead.permit_stage || '-'} />
              <Detail label="Permit value" value={lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'} />
              <Detail label="Contractor" value={lead.contractor_name === 'Not in public record' ? 'None listed' : (lead.contractor_name || 'None listed')} />
              <Detail label="Owner occupied" value={lead.owner_occupied === true ? 'Yes' : lead.owner_occupied === false ? 'No' : '-'} />
              <Detail label="Project scope" value={
                desc.includes('adu') ? 'ADU / Accessory Dwelling' :
                desc.includes('addition') ? 'Room Addition' :
                desc.includes('kitchen') ? 'Kitchen Remodel' :
                desc.includes('bathroom') ? 'Bathroom Remodel' :
                desc.includes('pool') ? 'Pool / Spa' :
                desc.includes('demo') ? 'Demolition' :
                lead.permit_type === 'Bldg-New' ? 'New Construction' :
                lead.permit_type === 'Bldg-Addition' ? 'Addition' :
                'Renovation / Repair'
              } />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Zoning & Buildability + Neighborhood Activity */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Zoning & buildability</h3>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Zone code" value={lead.zoning || '-'} />
            <Detail label="Zone description" value={lead.zoning_desc || '-'} />
            <Detail label="Max FAR" value={lead.max_far != null ? lead.max_far : '-'} />
            <Detail label="Max buildable" value={lead.max_far && lead.lot_size_sqft ? `${Math.round(lead.max_far * lead.lot_size_sqft).toLocaleString()} sqft` : '-'} />
            <Detail label="Hillside zone" value={lead.hillside_zone === true ? 'Yes' : lead.hillside_zone === false ? 'No' : '-'} />
            <Detail label="Historic zone" value={lead.historic_zone === true ? 'Yes' : lead.historic_zone === false ? 'No' : '-'} />
            <Detail label="Flood zone" value={lead.flood_zone || '-'} />
            <Detail label="Flood risk" value={lead.flood_zone_desc || (lead.flood_zone === 'X' ? 'Minimal risk' : lead.flood_zone === 'AE' ? 'High risk' : '-')} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {isEnviro ? 'Cluster opportunity' : 'Neighborhood activity'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-650 mb-1">Permits within 500ft</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{lead.neighbor_permits_500ft ?? '-'}</span>
                {lead.neighbor_permits_500ft >= 5 && (
                  <span className="badge badge-permit" style={{ fontSize: '9px', padding: '2px 6px' }}>Active zone</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-650 mb-1">Same street permits</div>
              <div className="text-2xl font-bold text-white">{lead.street_permit_count ?? '-'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-slate-650 mb-1">{isEnviro ? 'Cluster status' : 'Block status'}</div>
              <div className="text-sm text-white font-medium">
                {isEnviro && lead.neighbor_permits_500ft >= 5
                  ? 'Multi-home survey discount opportunity'
                  : lead.neighbor_permits_500ft >= 10 ? (lead.fire_zone_match ? 'Active rebuild zone' : 'High construction activity') :
                    lead.neighbor_permits_500ft >= 5 ? 'Moderate activity' :
                    lead.neighbor_permits_500ft >= 1 ? 'Some activity' :
                    lead.neighbor_permits_500ft === 0 ? 'No nearby permits' : '-'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <h4 className="text-xs text-slate-650 mb-3 uppercase tracking-wider font-mono">Contractor on permit</h4>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Contractor" value={lead.contractor_name || '-'} />
              <Detail label="License #" value={lead.contractor_license || '-'} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ENVIRO: Compliance Checklist */}
      {/* ═══════════════════════════════════════════════════ */}
      {isEnviro && isPre1978 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span>&#128203;</span> Compliance checklist
          </h3>
          <div className="flex flex-col gap-2.5">
            {[
              'Asbestos survey by certified CAC/CSST',
              'Lead paint testing (pre-1978 requirement)',
              'SCAQMD Rule 1403 notification (if asbestos found, 10 day wait)',
              'Abatement by C-22 or C-21 licensed contractor',
              'Air monitoring during abatement',
              'Clearance testing after abatement',
              'Waste disposal documentation (manifest)',
              'Provide clearance report to LADBS for permit',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: '1.5px solid #555',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 8,
                }} />
                <span className="text-slate-400">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs text-slate-500">Estimated timeline: 3-6 weeks from survey to clearance</div>
          </div>
        </div>
      )}

      {/* Permit Timeline */}
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

      {/* Permit Stack */}
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
                <span className="text-xs text-slate-650 ml-2">#{lead.permit_number}</span>
              </div>
              <span className="badge badge-stage">{lead.permit_stage}</span>
              <span className="text-xs text-slate-500">{formatDate(lead.permit_issued_at)}</span>
              <span className="text-xs text-accent font-medium">Current</span>
            </div>
            {lead.stackedPermits.map(p => (
              <PermitAccordion key={p.id} permit={p} />
            ))}
          </div>
        </div>
      )}

      {/* Inspection History */}
      {lead.inspections && lead.inspections.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            Inspection history
            <span className="ml-2 text-xs bg-[var(--sky-wash)] text-[var(--sky)] px-2 py-0.5 rounded-full font-semibold">{lead.inspections.length} inspections</span>
          </h3>
          <div className="overflow-hidden rounded-lg border border-[var(--line)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card-sunk)]">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-mono font-medium uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-mono font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-mono font-medium uppercase tracking-wider">Result</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-mono font-medium uppercase tracking-wider">Inspector</th>
                </tr>
              </thead>
              <tbody>
                {lead.inspections.map((insp, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    <td className="px-4 py-2.5 text-white font-medium">{insp.inspection_type || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{formatDate(insp.inspection_date)}</td>
                    <td className="px-4 py-2.5">
                      <InspectionResult result={insp.result} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{insp.inspector || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {lead.reasoning && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">AI score reasoning</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{lead.reasoning}</p>
        </div>
      )}

      {/* Permit Description */}
      {lead.permit_description && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Permit description</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{lead.permit_description}</p>
        </div>
      )}

      {/* Contact Unlock */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">Owner Contact Info</h3>
        <UnlockButton leadId={lead.id} address={lead.address} />
      </div>

      {/* Draft Outreach */}
      {lead.drafts && lead.drafts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-white mb-4">Draft outreach ({lead.drafts.length})</h3>
          <div className="flex flex-col gap-3">
            {lead.drafts.map(draft => (
              <DraftCard key={draft.id} draft={draft} onUpdate={async (id, status) => {
                await updateDraftStatus(id, status)
                const ctx = await getUserContext()
                const ids = ctx?.assignedLeadIds
                const updated = await getLeadDetail(params.id, ids)
                setLead(updated)
              }} />
            ))}
          </div>
        </div>
      )}

        </div>{/* end left column */}

        {/* Right column - Notes sidebar */}
        <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 20 }}>
          <NotesPanel leadId={lead.id} address={lead.address} />
        </div>

      </div>{/* end flex row */}
    </div>
  )
}

function InspectionResult({ result }) {
  if (!result) return <span className="text-slate-500">-</span>
  const r = result.toUpperCase()
  const isPassed = r.includes('PASS') || r.includes('APPROVED') || r.includes('OK')
  const isFailed = r.includes('FAIL') || r.includes('CORRECTION') || r.includes('REJECT')
  return (
    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
      isPassed ? 'bg-[var(--moss-wash)] text-[var(--moss)]' :
      isFailed ? 'bg-[var(--ruby-wash)] text-[var(--ruby)]' :
      'bg-[var(--amber-wash)] text-[var(--amber)]'
    }`}>
      {result}
    </span>
  )
}

function PermitAccordion({ permit }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg bg-navy-800 border border-navy-600 overflow-hidden transition-all">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-navy-700 transition-colors" onClick={() => setOpen(!open)}>
        <div className="w-2 h-2 rounded-full bg-slate-650" />
        <div className="flex-1">
          <span className="text-sm text-slate-300">{permit.permit_type}</span>
          <span className="text-xs text-slate-650 ml-2">#{permit.permit_number}</span>
        </div>
        <span className="badge badge-stage">{permit.permit_stage}</span>
        <span className="text-xs text-slate-500">{formatDate(permit.permit_issued_at)}</span>
        {permit.estimated_value > 0 && <span className="text-xs text-slate-500">${permit.estimated_value.toLocaleString()}</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-650 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-navy-700">
          <div className="flex items-center gap-3 mt-2">
            {permit.permit_filed_at && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-accent/50" />
                <span className="text-xs text-slate-500">Filed {formatDate(permit.permit_filed_at)}</span>
              </div>
            )}
            {permit.permit_filed_at && permit.permit_issued_at && (
              <div className="flex-1 h-px bg-accent/20 mx-1" />
            )}
            {permit.permit_issued_at && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-xs text-slate-500">Issued {formatDate(permit.permit_issued_at)}</span>
              </div>
            )}
            <div className="flex-1 h-px bg-navy-600 mx-1" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-650" />
              <span className="text-xs text-slate-650">{permit.permit_stage}</span>
            </div>
          </div>
          {permit.estimated_value > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              Permit value: <span className="text-white font-medium">${permit.estimated_value.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, highlight, highlightColor }) {
  return (
    <div>
      <div className="text-xs text-slate-650 mb-1">{label}</div>
      <div className="text-sm font-medium" style={{ color: highlight ? highlightColor : '#fff' }}>{value}</div>
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
