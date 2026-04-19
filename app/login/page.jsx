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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page)' }}>
      <div className="card-raised" style={{ width: 400, padding: '48px 40px', borderRadius: 'var(--r-card-lg)' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="icon-chip icon-chip-ember">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 22h4l1.5-4h7l1.5 4h4L12 2zm-1.5 12L12 8l1.5 6h-3z" fill="#FFFFFF"/><polygon points="12,5 12.9,7.8 15.8,7.8 13.4,9.5 14.3,12.3 12,10.6 9.7,12.3 10.6,9.5 8.2,7.8 11.1,7.8" fill="#CC2936"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-0">American Leads</div>
            <div className="font-mono text-[10px] text-ember">AMERICAN LEADS</div>
          </div>
        </div>

        <h1 className="text-2xl text-ink-0 mb-8">
          <span className="font-serif">Welcome </span>
          <span className="font-serif italic">back</span>
        </h1>

        <form onSubmit={handleSubmit}>
          <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-2">ACCESS CODE</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter access code"
            autoFocus
            className="input-sunk w-full mb-4"
            style={{ height: 46 }}
          />
          {error && <div className="font-mono text-[11px] text-ruby mb-3">{error}</div>}
          <button type="submit" disabled={loading} className="btn-ember w-full" style={{ height: 46 }}>
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
