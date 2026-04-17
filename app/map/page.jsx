'use client'
import { useState, useEffect, useRef } from 'react'
import { getAllLeads } from '@/lib/supabase'

export default function MapPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    async function load() {
      const data = await getAllLeads({})
      setLeads(data.filter(l => l.latitude && l.longitude))
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return

    const loadMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const map = L.map(mapRef.current).setView([34.05, -118.53], 13)
      mapInstance.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
      }).addTo(map)

      leads.forEach(lead => {
        const color = lead.score >= 75 ? '#ff6b35' : lead.score >= 50 ? '#fbbf24' : '#6b7280'
        const marker = L.circleMarker([lead.latitude, lead.longitude], {
          radius: 6,
          fillColor: color,
          fillOpacity: 0.9,
          color: color,
          weight: 1,
          opacity: 0.5,
        }).addTo(map)

        marker.on('click', () => setSelected(lead))
      })
    }

    loadMap()

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [loading, leads])

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Map View</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} permits with coordinates</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent" /> Score 75+</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Score 50-74</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-500" /> Below 50</span>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="text-accent animate-pulse text-sm">Loading map...</div></div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}

        {selected && (
          <div className="absolute bottom-6 left-6 right-6 max-w-md card p-5 z-[1000]">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 text-slate-500 hover:text-white text-lg">&times;</button>
            <div className="text-base font-semibold text-white mb-1">{selected.address}</div>
            <div className="flex gap-1.5 mb-3">
              <span className="badge badge-permit">{selected.permit_type}</span>
              {selected.dins_damage && selected.dins_damage !== 'Unknown' && (
                <span className={`badge ${selected.dins_damage.includes('Destroyed') ? 'badge-destroyed' : 'badge-affected'}`}>
                  {selected.dins_damage.includes('Destroyed') ? 'Destroyed' : selected.dins_damage.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mb-3">
              {selected.beds > 0 && `${selected.beds} bed / `}{selected.baths > 0 && `${selected.baths} bath / `}{selected.sqft > 0 && `${selected.sqft.toLocaleString()} sqft`}
              {selected.assessor_value > 0 && ` / $${(selected.assessor_value / 1e6).toFixed(1)}M`}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" style={{ color: selected.score >= 75 ? '#ff6b35' : '#fbbf24' }}>{selected.score}</span>
              <a href={`/leads/${selected.id}`} className="btn-primary text-xs">View details</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
