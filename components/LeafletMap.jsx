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

export default function LeafletMap({ leads, onSelect, mapboxToken, mapStyle = 'dark', fitToLeads = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const tileLayerRef = useRef(null)

  // Initialize map once
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

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Handle tile layer changes (style + token)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    if (mapboxToken) {
      const style = STYLES[mapStyle] || STYLES.dark
      tileLayerRef.current = L.tileLayer(
        `https://api.mapbox.com/styles/v1/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`, {
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: -1,
        attribution: '',
      }).addTo(map)
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '',
      }).addTo(map)
    }
  }, [mapboxToken, mapStyle])

  // Handle markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    const tooltipBg = mapStyle === 'satellite' ? 'rgba(0,0,0,0.8)' : '#212126'

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
        `<div style="background:${tooltipBg};border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;color:${color};text-align:center;min-width:32px">${lead.score}</div>`,
        { direction: 'top', offset: [0, -10], className: 'clean-tooltip' }
      )

      marker.on('click', () => onSelect(lead))
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    // Auto-fit to search results
    if (fitToLeads && leads.length > 0 && leads.length <= 20) {
      const bounds = L.latLngBounds(leads.map(l => [l.latitude, l.longitude]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [leads, onSelect, mapStyle, fitToLeads])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r-card, 22px)', overflow: 'hidden' }} />
}
