'use client'
import { useState, useEffect } from 'react'

export default function StreetView({ latitude, longitude, address }) {
  const [available, setAvailable] = useState(null)
  const [heading, setHeading] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      if (!latitude || !longitude) { setAvailable(false); setLoading(false); return }
      try {
        const resp = await fetch(`/api/streetview?lat=${latitude}&lng=${longitude}`)
        if (resp.headers.get('content-type')?.includes('image')) {
          setAvailable(true)
        } else {
          const data = await resp.json()
          setAvailable(data.available !== false)
        }
      } catch {
        setAvailable(false)
      }
      setLoading(false)
    }
    check()
  }, [latitude, longitude])

  function rotate(dir) {
    setHeading(prev => (prev + dir + 360) % 360)
  }

  const imgUrl = `/api/streetview?lat=${latitude}&lng=${longitude}&heading=${heading}`

  if (loading) {
    return (
      <div style={{
        background: 'var(--card, #212126)', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 0 }} />
        <div style={{ padding: 12 }}>
          <div className="font-mono text-[10px] text-ink-3 tracking-wider">STREET VIEW</div>
        </div>
      </div>
    )
  }

  if (!available) return null

  return (
    <div style={{
      background: 'var(--card, #212126)', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ position: 'relative' }}>
        <img
          key={heading}
          src={imgUrl}
          alt={`Street view of ${address}`}
          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
        />

        {/* Rotate buttons */}
        <button
          onClick={() => rotate(-60)}
          style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          onClick={() => rotate(60)}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* Heading indicator */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.6)', borderRadius: 8,
          padding: '3px 8px', fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
          color: '#aaa',
        }}>
          {heading === 0 ? 'N' : heading === 60 ? 'NE' : heading === 120 ? 'SE' : heading === 180 ? 'S' : heading === 240 ? 'SW' : heading === 300 ? 'NW' : `${heading}\u00B0`}
        </div>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="font-mono text-[10px] tracking-wider" style={{ color: '#8B8B96' }}>STREET VIEW</div>
        <div className="font-mono text-[9px]" style={{ color: '#555560' }}>Google Street View</div>
      </div>
    </div>
  )
}
