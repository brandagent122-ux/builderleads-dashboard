'use client'
import { useState, useEffect } from 'react'

// Approximate positions on a 160x70 SVG for SoCal areas
const MARKET_POSITIONS = {
  palisades:     { x: 30, y: 20, label: 'PAL' },
  westla:        { x: 45, y: 32, label: 'WLA' },
  venice:        { x: 38, y: 38, label: 'VEN' },
  westchester:   { x: 40, y: 48, label: 'WCH' },
  hollywood:     { x: 65, y: 22, label: 'HWD' },
  encino:        { x: 52, y: 10, label: 'ENC' },
  shermanoaks:   { x: 65, y: 12, label: 'SO' },
  studiocity:    { x: 75, y: 14, label: 'SC' },
  woodlandhills: { x: 38, y: 8, label: 'WH' },
  southla:       { x: 75, y: 42, label: 'SLA' },
  sanpedro:      { x: 72, y: 58, label: 'SP' },
  wilmington:    { x: 65, y: 55, label: 'WLM' },
  harborcity:    { x: 58, y: 55, label: 'HC' },
}

export default function MarketSelector({ activeMarket, onSelect }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/markets')
        const data = await resp.json()
        setMarkets(data.markets || [])
      } catch (e) {
        console.error('Failed to load markets:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading || markets.length === 0) return null

  const active = markets.find(m => m.slug === activeMarket) || markets[0]

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Mini Map */}
      <div style={{
        background: 'var(--card-sunk, #19191D)',
        borderRadius: 10,
        padding: 6,
        marginBottom: 8,
        cursor: 'pointer',
      }}>
        <svg viewBox="0 0 160 70" style={{ width: '100%', display: 'block' }}>
          <defs>
            <style>{`
              @keyframes market-pulse { 0%,100% { r: 4; opacity: 0.3; } 50% { r: 7; opacity: 0.12; } }
              .market-active-glow { animation: market-pulse 2s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* SoCal coastline */}
          <path
            d="M5 15 Q15 12 25 18 Q35 8 50 5 Q65 3 80 8 Q95 5 110 10 Q120 8 130 12 Q138 15 145 22 L148 30 Q150 40 145 50 Q140 55 130 58 Q115 62 100 60 Q85 58 70 55 Q55 52 40 48 Q25 44 15 38 Q8 32 5 25 Z"
            fill="#1a1a1e" stroke="#2a2a2e" strokeWidth="0.5"
          />
          {/* Ocean label */}
          <text x="30" y="60" fontSize="5" fill="#1e1e22" fontFamily="monospace">Pacific Ocean</text>

          {/* Market dots */}
          {markets.map(market => {
            const pos = MARKET_POSITIONS[market.slug]
            if (!pos) return null
            const isActive = market.slug === activeMarket
            return (
              <g key={market.slug} onClick={() => onSelect(market.slug)} style={{ cursor: 'pointer' }}>
                {isActive && (
                  <circle className="market-active-glow" cx={pos.x} cy={pos.y} r="4" fill={market.color || '#FF7A3D'} />
                )}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isActive ? 3 : 2}
                  fill={market.color || '#60a5fa'}
                  opacity={isActive ? 1 : 0.5}
                />
                <text
                  x={pos.x} y={pos.y - 5}
                  fontSize={isActive ? 6 : 5}
                  fill={isActive ? (market.color || '#FF7A3D') : '#555'}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight={isActive ? 'bold' : 'normal'}
                >{pos.label}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Market list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {markets.map(market => {
          const isActive = market.slug === activeMarket
          return (
            <button
              key={market.slug}
              onClick={() => onSelect(market.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', borderRadius: 6,
                background: isActive ? `${market.color || '#FF7A3D'}10` : 'transparent',
                border: isActive ? `1px solid ${market.color || '#FF7A3D'}25` : '1px solid transparent',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: market.color || '#60a5fa',
                opacity: isActive ? 1 : 0.5,
              }} />
              <span style={{
                fontSize: 9, flex: 1,
                color: isActive ? (market.color || '#FF7A3D') : '#888',
                fontFamily: 'Inter, sans-serif',
                fontWeight: isActive ? 600 : 400,
              }}>{market.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
