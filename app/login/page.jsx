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

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10' }}>
      <div style={{ width: 360, padding: 40, background: '#14151f', borderRadius: 12, border: '1px solid #1e2030' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: '#ff6b35', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0b10" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>BuilderLeads</div>
            <div style={{ fontSize: 12, color: '#ff6b35' }}>Palisades Fire Intel</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: '#6b6c7e', display: 'block', marginBottom: 8 }}>Enter access code</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Access code"
            autoFocus
            style={{
              width: '100%', padding: '12px 16px', background: '#0a0b10', border: '1px solid #1e2030',
              borderRadius: 8, color: 'white', fontSize: 14, outline: 'none', marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', background: '#ff6b35', color: '#0a0b10',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
