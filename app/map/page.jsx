'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAllLeads, getUserContext, getActiveMarket } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-full" style={{ borderRadius: 'var(--r-card, 22px)' }} />
})

const FILTERS = [
  { label: 'ALL', min: 0, max: 100 },
  { label: '90+', min: 90, max: 100 },
  { label: '75+', min: 75, max: 100 },
  { label: '50+', min: 50, max: 100 },
  { label: '<50', min: 0, max: 49 },
]

// Center coordinates and zoom for each market
const MARKET_CENTERS = {
  all:           { lat: 34.00, lng: -118.40, zoom: 10 },
  palisades:     { lat: 34.05, lng: -118.53, zoom: 13 },
  westla:        { lat: 34.04, lng: -118.44, zoom: 14 },
  sanpedro:      { lat: 33.73, lng: -118.29, zoom: 13 },
  wilmington:    { lat: 33.78, lng: -118.26, zoom: 14 },
  harborcity:    { lat: 33.79, lng: -118.30, zoom: 14 },
  encino:        { lat: 34.16, lng: -118.50, zoom: 13 },
  shermanoaks:   { lat: 34.15, lng: -118.45, zoom: 13 },
  studiocity:    { lat: 34.14, lng: -118.39, zoom: 14 },
  woodlandhills: { lat: 34.17, lng: -118.60, zoom: 13 },
  venice:        { lat: 33.99, lng: -118.47, zoom: 14 },
  westchester:   { lat: 33.96, lng: -118.40, zoom: 13 },
  southla:       { lat: 33.96, lng: -118.27, zoom: 13 },
  hollywood:     { lat: 34.10, lng: -118.33, zoom: 14 },
}

export default function MapPage() {
  const [allLeads, setAllLeads] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [mapboxToken, setMapboxToken] = useState(null)
  const [mapStyle, setMapStyle] = useState('dark')
  const [search, setSearch] = useState('')
  const [markets, setMarkets] = useState([])
  const [selectedCity, setSelectedCity] = useState('all')
  const [flyTo, setFlyTo] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Load all data once
  useEffect(() => {
    async function load() {
      const [ctx, tokenResp, marketsResp] = await Promise.all([
        getUserContext(),
        fetch('/api/mapbox').then(r => r.json()).catch(() => ({ token: '' })),
        fetch('/api/markets').then(r => r.json()).catch(() => ({ markets: [] })),
      ])
      setMapboxToken(tokenResp.token || '')
      setMarkets(marketsResp.markets || [])
      if (!ctx) { setLoading(false); return }
      setIsAdmin(ctx.isAdmin)
      const ids = ctx.assignedLeadIds

      // Admin: load all leads across all markets
      // Client: load only assigned leads
      let data
      if (ctx.isAdmin) {
        data = await getAllLeads({}, null, null)
      } else {
        data = await getAllLeads({}, ids, null)
      }
      const withCoords = data.filter(l => l.latitude && l.longitude)
      setAllLeads(withCoords)
      setLeads(withCoords)
      setLoading(false)
      logActivity('map_viewed', `${withCoords.length} leads on map`)

      // Initial fly to show all leads
      if (withCoords.length > 0) {
        setFlyTo({ lat: 34.00, lng: -118.40, zoom: 10 })
      }
    }
    load()
  }, [])

  // Handle city filter
  function handleCityChange(slug) {
    setSelectedCity(slug)
    setSelectedLead(null)
    setSearch('')

    if (slug === 'all') {
      setLeads(allLeads)
      // Fly to show all of LA
      if (allLeads.length > 0) {
        const lats = allLeads.map(l => l.latitude)
        const lngs = allLeads.map(l => l.longitude)
        setFlyTo({
          bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
          maxZoom: 12,
        })
      }
    } else {
      const cityLeads = allLeads.filter(l => l.market === slug)
      setLeads(cityLeads)

      if (cityLeads.length > 0) {
        // Fly to city's leads
        const lats = cityLeads.map(l => l.latitude)
        const lngs = cityLeads.map(l => l.longitude)
        setFlyTo({
          bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
          maxZoom: 15,
        })
      } else {
        // No leads yet, fly to market center
        const center = MARKET_CENTERS[slug]
        if (center) setFlyTo(center)
      }
    }
  }

  // Listen for sidebar market changes
  useEffect(() => {
    const onMarketChange = (e) => {
      const slug = e.detail || 'palisades'
      handleCityChange(slug)
    }
    window.addEventListener('market-changed', onMarketChange)
    return () => window.removeEventListener('market-changed', onMarketChange)
  }, [allLeads])

  const handleSelect = useCallback((lead) => {
    setSelectedLead(lead)
    if (lead) logActivity('map_lead_clicked', lead.address, lead.id)
  }, [])

  // Apply score filter and search
  const f = FILTERS[activeFilter]
  const filtered = leads.filter(l => {
    if (l.score < f.min || l.score > f.max) return false
    if (search) {
      const s = search.toLowerCase()
      return (l.address || '').toLowerCase().includes(s)
    }
    return true
  })

  // Auto-zoom on search
  useEffect(() => {
    if (search && filtered.length > 0 && filtered.length <= 20) {
      const lats = filtered.map(l => l.latitude)
      const lngs = filtered.map(l => l.longitude)
      setFlyTo({
        bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        maxZoom: 16,
      })
    }
  }, [search, filtered.length])

  const totalValue = filtered.reduce((sum, l) => sum + (l.assessor_value || 0), 0)
  const cityLabel = selectedCity === 'all' ? 'All Markets' : (markets.find(m => m.slug === selectedCity)?.name || selectedCity)

  function getColor(score) {
    if (score >= 85) return '#FF7A3D'
    if (score >= 75) return '#FF9A6A'
    if (score >= 50) return '#FBBF24'
    return '#555560'
  }

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Map View</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {filtered.length} LEADS {selectedCity !== 'all' && `\u00B7 ${cityLabel.toUpperCase()}`} {activeFilter > 0 && `\u00B7 SCORE ${f.label}`} \u00B7 ${totalValue >= 1e9 ? `$${(totalValue / 1e9).toFixed(1)}B` : `$${(totalValue / 1e6).toFixed(0)}M`} VALUE
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card-raised p-2 flex gap-2 mb-4 items-center flex-wrap" style={{ borderRadius: 16 }}>
        {/* City dropdown */}
        <div style={{ position: 'relative', flex: '0 0 160px' }}>
          <select
            value={selectedCity}
            onChange={e => handleCityChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 28px 8px 10px', borderRadius: 12, fontSize: 11,
              background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.06)',
              color: selectedCity === 'all' ? '#FF7A3D' : '#f0f0f0',
              outline: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              letterSpacing: 0.5, cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
            }}>
            <option value="all" style={{ background: '#19191D' }}>ALL MARKETS</option>
            {markets.map(m => (
              <option key={m.slug} value={m.slug} style={{ background: '#19191D' }}>{m.name.toUpperCase()}</option>
            ))}
          </select>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)' }} />

        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 180px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555560" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search address..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 12, fontSize: 12,
              background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#f0f0f0', outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#555560', fontSize: 14 }}>
              x
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)' }} />

        {/* Score filters */}
        {FILTERS.map((filter, i) => {
          const count = leads.filter(l => l.score >= filter.min && l.score <= filter.max).length
          return (
            <button key={i} onClick={() => { setActiveFilter(i); setSelectedLead(null) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-mono font-medium transition-all ${
                activeFilter === i
                  ? 'bg-[var(--card,#212126)] text-ember shadow-[4px_4px_10px_rgba(0,0,0,0.35),_-3px_-3px_8px_rgba(255,255,255,0.025)]'
                  : 'text-ink-3 hover:text-ink-1'
              }`}>
              {i > 0 && <div className="w-2 h-2 rounded-full" style={{ background: i === 1 ? '#FF7A3D' : i === 2 ? '#FF9A6A' : i === 3 ? '#FBBF24' : '#555560' }} />}
              {filter.label}
              <span className="text-[9px] text-ink-3">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 'calc(100vh - 240px)' }}>
        {loading ? (
          <div className="skeleton w-full h-full" style={{ borderRadius: 'var(--r-card, 22px)' }} />
        ) : (
          <div className="card-raised overflow-hidden" style={{ height: '100%', borderRadius: 'var(--r-card, 22px)' }}>
            <LeafletMap leads={filtered} onSelect={handleSelect} mapboxToken={mapboxToken} mapStyle={mapStyle} flyTo={flyTo} />
          </div>
        )}

        {/* Lead count card */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="card-raised px-4 py-3" style={{ borderRadius: 14 }}>
            <div className="font-mono text-[10px] text-ink-3 tracking-wider">VISIBLE LEADS</div>
            <div className="text-xl font-bold text-ink-0">{filtered.length}</div>
            {selectedCity !== 'all' && (
              <div className="font-mono text-[9px] mt-1" style={{ color: markets.find(m => m.slug === selectedCity)?.color || '#FF7A3D' }}>
                {cityLabel}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="card-raised px-3 py-2 flex items-center gap-4" style={{ borderRadius: 10, fontSize: 11 }}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF7A3D]" />75+</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />50-74</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#555560]" />&lt;50</span>
          </div>
        </div>

        {/* Satellite toggle */}
        <div className="absolute bottom-4 right-4 z-[1000]">
          <button
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : 'dark')}
            className="card-raised"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 12,
              border: 'none', cursor: 'pointer',
              background: 'var(--card, #212126)',
              color: '#B8B8BF', fontSize: 11, fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.5,
            }}>
            {mapStyle === 'dark' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Satellite
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
                </svg>
                Dark Map
              </>
            )}
          </button>
        </div>

        {/* Selected lead detail card */}
        {selectedLead && (
          <div className="absolute bottom-4 left-4 z-[1000]" style={{ width: 320 }}>
            <div className="card-raised p-4" style={{ borderRadius: 16, borderLeft: `3px solid ${getColor(selectedLead.score)}` }}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-semibold text-ink-0 leading-tight" style={{ maxWidth: 220 }}>{selectedLead.address}</div>
                <div className="font-mono text-lg font-bold" style={{ color: getColor(selectedLead.score) }}>{selectedLead.score}</div>
              </div>
              <div className="flex gap-2 flex-wrap mb-2">
                <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: '#FF7A3D15', color: '#FF7A3D' }}>{selectedLead.permit_type}</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: '#3b82f615', color: '#60a5fa' }}>{selectedLead.permit_stage}</span>
                {selectedLead.market && selectedLead.market !== 'palisades' && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: '#a855f715', color: '#c084fc' }}>{selectedLead.market}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                {selectedLead.assessor_value > 0 && <div><span className="text-ink-3">Value:</span> <span className="text-ink-1">${(selectedLead.assessor_value / 1e6).toFixed(2)}M</span></div>}
                {selectedLead.sqft > 0 && <div><span className="text-ink-3">Sqft:</span> <span className="text-ink-1">{selectedLead.sqft.toLocaleString()}</span></div>}
                {selectedLead.dins_damage && <div><span className="text-ink-3">Damage:</span> <span className="text-ink-1">{selectedLead.dins_damage}</span></div>}
                {selectedLead.contractor_name && <div><span className="text-ink-3">GC:</span> <span className="text-ink-1">{selectedLead.contractor_name === 'Not in public record' ? 'None listed' : selectedLead.contractor_name}</span></div>}
              </div>
              <a href={`/leads/${selectedLead.id}`} className="block mt-3 text-center text-[11px] font-mono font-semibold text-ember hover:underline">
                VIEW FULL LEAD \u2192
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
