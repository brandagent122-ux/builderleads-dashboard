'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function getColor(score) {
  if (score >= 85) return '#FF7A3D'
  if (score >= 75) return '#FF9A6A'
  if (score >= 50) return '#FBBF24'
  return '#555560'
}

function getRadius(score) {
  if (score >= 85) return 8
  if (score >= 75) return 7
  if (score >= 50) return 6
  return 4
}

export default function LeafletMap({ leads, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [34.05, -118.53],
      zoom: 13,
      zoomControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
    })

    L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`, {
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '',
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    leads.forEach(lead => {
      const color = getColor(lead.score)
      const radius = getRadius(lead.score)

      const marker = L.circleMarker([lead.latitude, lead.longitude], {
        radius,
        fillColor: color,
        fillOpacity: 0.85,
        color: color,
        weight: 2,
        opacity: 0.4,
      })

      marker.bindTooltip(
        `<div style="background:#212126;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;color:${color};text-align:center;min-width:32px">${lead.score}</div>`,
        { direction: 'top', offset: [0, -10], className: 'clean-tooltip' }
      )

      marker.on('click', () => onSelect(lead))
      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [leads, onSelect])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r-card, 22px)', overflow: 'hidden' }} />
}
