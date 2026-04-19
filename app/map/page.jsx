'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { getAllLeads } from '@/lib/supabase'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false })
const useMap = dynamic(() => import('react-leaflet').then(m => m.useMap), { ssr: false })

const SCORE_FILTERS = [
  { label: 'ALL', min: 0, max: 100 },
  { label: '90+', min: 90, max: 100 },
  { label: '75+', min: 75, max: 100 },
  { label: '50+', min: 50, max: 100 },
  { label: '<50', min: 0, max: 49 },
]

export default function MapPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    async function load() {
      const data = await getAllLeads({})
      setLeads(data.filter(l => l.latitude && l.longitude))
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    setMapReady(true)
  }, [])

  const filter = SCORE_FILTERS[activeFilter]
  const filtered = leads.filter(l => l.score >= filter.min && l.score <= filter.max)

  const totalValue = filtered.reduce((sum, l) => sum + (l.assessor_value || 0), 0)

  function getColor(score) {
    if (score >= 85) return '#FF7A3D'
    if (score >= 75) return '#FF9A6A'
    if (score >= 50) return '#FBBF24'
    return '#555560'
  }

  function getRadius(score) {
    if (score >= 85) return 7
    if (score >= 75) return 6
    if (score >= 50) return 5
    return 4
  }

  if (loading) {
    return (
      <div className="px-2">
        <div className="skeleton h-12 w-64 mb-4" style={{ borderRadius: 'var(--r-card)' }} />
        <div className="skeleton" style={{ height: 'calc(100vh - 200px)', borderRadius: 'var(--r-card)' }} />
      </div>
    )
  }

  return (
    <div className="px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Map View</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {filtered.length} LEADS {activeFilter > 0 ? `\u00B7 SCORE ${filter.label}` : '\u00B7 ALL SCORES'} \u00B7 ${(totalValue / 1e9).toFixed(1)}B VALUE
          </p>
        </div>
      </div>

      {/* Score filter chips */}
      <div className="card-raised p-2 flex gap-2 mb-4" style={{ borderRadius: 16 }}>
        {SCORE_FILTERS.map((f, i) => {
          const count = leads.filter(l => l.score >= f.min && l.score <= f.max).length
          return (
            <button key={i} onClick={() => { setActiveFilter(i); setSelectedLead(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-mono font-medium transition-all ${
                activeFilter === i
                  ? 'bg-[var(--card)] text-ember shadow-[var(--shadow-raised-sm)]'
                  : 'text-ink-3 hover:text-ink-1'
              }`}>
              {i > 0 && <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 1 ? '#FF7A3D' : i === 2 ? '#FF9A6A' : i === 3 ? '#FBBF24' : '#555560' }} />}
              {f.label}
              <span className="text-[10px] text-ink-3">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Map container */}
      <div className="relative card-raised overflow-hidden" style={{ height: 'calc(100vh - 240px)', borderRadius: 'var(--r-card)' }}>
        {mapReady && (
          <MapContainer
            center={[34.05, -118.53]}
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#141416' }}
            zoomControl={false}
            zoomSnap={0.5}
            zoomDelta={0.5}
            wheelPxPerZoomLevel={120}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />
            <ZoomControl />
            {filtered.map(lead => (
              <CircleMarker
                key={lead.id}
                center={[lead.latitude, lead.longitude]}
                radius={getRadius(lead.score)}
                pathOptions={{
                  fillColor: getColor(lead.score),
                  fillOpacity: 0.85,
                  color: getColor(lead.score),
                  weight: 1.5,
                  opacity: 0.4,
                }}
                eventHandlers={{
                  click: () => setSelectedLead(lead),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  className="score-tooltip"
                >
                  <div style={{
                    background: '#212126', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: '4px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                    color: getColor(lead.score), textAlign: 'center',
                  }}>
                    {lead.score}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Selected lead detail card - bottom left */}
        {selectedLead && (
          <div className="absolute bottom-4 left-4 z-[1000] w-[340px]"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="card-raised p-4" style={{ borderRadius: 18, border: '1px solid rgba(255,122,61,0.15)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-ink-0">{selectedLead.address}</div>
                  <div className="font-mono text-[11px] text-ink-2 mt-1 tracking-wider">
                    {selectedLead.beds > 0 && `${selectedLead.beds}BD`} {selectedLead.baths > 0 && `${selectedLead.baths}BA`} {selectedLead.sqft > 0 && `${selectedLead.sqft.toLocaleString()}SF`}
                    {selectedLead.assessor_value > 0 && ` \u00B7 $${(selectedLead.assessor_value / 1e6).toFixed(1)}M`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm font-bold"
                    style={{ border: `2px solid ${getColor(selectedLead.score)}`, color: getColor(selectedLead.score) }}>
                    {selectedLead.score}
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="text-ink-3 hover:text-ink-1 p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 mb-3 flex-wrap">
                <DamageTag damage={selectedLead.dins_damage} />
                <span className="tag tag-permit">{selectedLead.permit_type}</span>
                <span className="tag tag-stage">{selectedLead.permit_stage}</span>
              </div>
              <a href={`/leads/${selectedLead.id}`}
                className="btn-ember w-full text-center block text-[12px] py-2.5">
                View full details
              </a>
            </div>
          </div>
        )}

        {/* Legend - top right */}
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="card-raised px-3 py-2 flex items-center gap-3" style={{ borderRadius: 12 }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF7A3D' }} />
              <span className="font-mono text-[10px] text-ink-2">75+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FBBF24' }} />
              <span className="font-mono text-[10px] text-ink-2">50-74</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#555560' }} />
              <span className="font-mono text-[10px] text-ink-2">&lt;50</span>
            </div>
          </div>
        </div>

        {/* Quick stats - top left */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="card-raised px-4 py-3" style={{ borderRadius: 14 }}>
            <div className="font-mono text-[10px] text-ink-3 tracking-wider">VISIBLE LEADS</div>
            <div className="text-xl font-bold text-ink-0">{filtered.length}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 6px 6px 14px rgba(0,0,0,0.45), -4px -4px 12px rgba(255,255,255,0.03) !important;
          border-radius: 14px !important;
          overflow: hidden !important;
        }
        .leaflet-control-zoom a {
          background: #212126 !important;
          color: #B8B8BF !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 16px !important;
        }
        .leaflet-control-zoom a:hover {
          background: #26262B !important;
          color: #FFFFFF !important;
        }
        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip-top::before {
          display: none !important;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function ZoomControl() {
  return null
}

function DamageTag({ damage }) {
  if (!damage || damage === 'Unknown') return null
  const cls = damage.includes('Destroyed') ? 'tag-destroyed' : damage.includes('Major') ? 'tag-major' : damage.includes('Minor') ? 'tag-minor' : damage.includes('Affected') ? 'tag-affected' : 'tag-nodamage'
  const label = damage.includes('Destroyed') ? 'DESTROYED' : damage.includes('Major') ? 'MAJOR' : damage.includes('Minor') ? 'MINOR' : damage.includes('Affected') ? 'AFFECTED' : 'NO DAMAGE'
  return <span className={`tag ${cls}`}>{label}</span>
}
