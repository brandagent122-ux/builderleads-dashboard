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

const STYLES = {
  dark: 'mapbox/dark-v11',
  satellite: 'mapbox/satellite-streets-v12',
}

export default function LeafletMap({ leads, onSelect, mapboxToken, mapStyle = 'dark', flyTo = null }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const tileLayerRef = useRef(null)
  const prevFlyRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [34.05, -118.40],
      zoom: 11,
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
    })
    L.control.zoom({ position: 'bottomleft' }).addTo(map)
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    if (mapboxToken) {
      const style = STYLES[mapStyle] || STYLES.dark
      tileLayerRef.current = L.tileLayer(
        `https://api.mapbox.com/styles/v1/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`, {
        maxZoom: 19, tileSize: 512, zoomOffset: -1, attribution: '',
      }).addTo(map)
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '',
      }).addTo(map)
    }
  }, [mapboxToken, mapStyle])

  // Fly animation
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !flyTo) return
    const key = JSON.stringify(flyTo)
    if (key === prevFlyRef.current) return
    prevFlyRef.current = key

    if (flyTo.bounds) {
      map.flyToBounds(flyTo.bounds, { padding: [60, 60], maxZoom: flyTo.maxZoom || 14, duration: 1.5 })
    } else if (flyTo.lat && flyTo.lng) {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 13, { duration: 1.5, easeLinearity: 0.25 })
    }
  }, [flyTo])

  // Markers with staggered entrance
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    const tooltipBg = mapStyle === 'satellite' ? 'rgba(0,0,0,0.8)' : '#212126'
    const sorted = [...leads].sort((a, b) => a.score - b.score)

    sorted.forEach((lead, index) => {
      const color = getColor(lead.score)
      const finalRadius = getRadius(lead.score)

      const marker = L.circleMarker([lead.latitude, lead.longitude], {
        radius: 0, fillColor: color, fillOpacity: 0, color: color, weight: 2, opacity: 0,
      })

      marker.bindTooltip(
        `<div style="background:${tooltipBg};border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;color:${color};text-align:center;min-width:32px">${lead.score}</div>`,
        { direction: 'top', offset: [0, -10], className: 'clean-tooltip' }
      )

      marker.on('click', () => onSelect(lead))
      marker.addTo(map)
      markersRef.current.push(marker)

      // Staggered entrance: pins appear one by one
      const delay = Math.min(index * 4, 800)
      setTimeout(() => {
        marker.setStyle({ radius: finalRadius, fillOpacity: 0.85, opacity: 0.4 })
      }, 300 + delay)
    })
  }, [leads, onSelect, mapStyle])

  return (
    <>
      <style>{`
        path.leaflet-interactive {
          transition: r 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                      fill-opacity 0.6s ease,
                      stroke-opacity 0.6s ease !important;
        }
        .clean-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .clean-tooltip::before { display: none !important; }
        .leaflet-control-zoom { border: none !important; border-radius: 12px !important; overflow: hidden !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; }
        .leaflet-control-zoom a { background: #212126 !important; color: #888 !important; border: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 16px !important; }
        .leaflet-control-zoom a:hover { background: #2a2a30 !important; color: #f0f0f0 !important; }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r-card, 22px)', overflow: 'hidden' }} />
    </>
  )
}
