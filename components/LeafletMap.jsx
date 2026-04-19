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
  if (score >= 85) return 7
  if (score >= 75) return 6
  if (score >= 50) return 5
  return 4
}

export default function LeafletMap({ leads, selectedLead, onSelect }) {
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
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

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    // Add new markers
    leads.forEach(lead => {
      const color = getColor(lead.score)
      const radius = getRadius(lead.score)

      const marker = L.circleMarker([lead.latitude, lead.longitude], {
        radius,
        fillColor: color,
        fillOpacity: 0.85,
        color: color,
        weight: 1.5,
        opacity: 0.4,
      })

      marker.bindTooltip(`<div style="background:#212126;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:4px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;color:${color};text-align:center">${lead.score}</div>`, {
        direction: 'top',
        offset: [0, -8],
        className: 'score-tooltip-custom',
      })

      marker.on('click', () => onSelect(lead))
      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [leads, onSelect])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r-card, 22px)', overflow: 'hidden' }} />
}
