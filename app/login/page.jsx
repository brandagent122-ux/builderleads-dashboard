'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { router.push('/'); router.refresh() }
    else { setError('Invalid access code'); setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#141416',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 420, padding: '48px 40px',
        background: '#212126',
        borderRadius: 26,
        boxShadow: '6px 6px 14px rgba(0,0,0,0.45), -4px -4px 12px rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #FF7A3D, #CC6231)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>BuilderLeads</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#FF7A3D', letterSpacing: 1.5 }}>PALISADES FIRE INTEL</div>
          </div>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 8, letterSpacing: '-0.5px' }}>
          Welcome back
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555560', marginBottom: 32, letterSpacing: 0.5 }}>
          Enter your access code to continue
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555560', letterSpacing: 1.2, display: 'block', marginBottom: 8 }}>ACCESS CODE</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter code"
            autoFocus
            style={{
              width: '100%', height: 48, padding: '0 18px',
              background: '#19191D',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(255,255,255,0.025)',
              color: '#FFFFFF', fontSize: 15, outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxSizing: 'border-box',
              marginBottom: error ? 0 : 20,
            }}
          />
          {error && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#F87171', margin: '10px 0 10px' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', height: 48,
            background: loading ? '#19191D' : 'linear-gradient(135deg, #FF7A3D, #CC6231)',
            color: loading ? '#555560' : '#141416',
            fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
            boxShadow: loading ? 'inset 3px 3px 8px rgba(0,0,0,0.5)' : '4px 4px 10px rgba(0,0,0,0.35), -3px -3px 8px rgba(255,255,255,0.025)',
          }}>
            {loading ? 'VERIFYING...' : 'ENTER'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555560' }}>
            POWERED BY RU4REELZ
          </span>
        </div>
      </div>
    </div>
  )
}
