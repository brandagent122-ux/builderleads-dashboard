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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-0">BuilderLeads</div>
            <div className="font-mono text-[10px] text-ember">PALISADES FIRE INTEL</div>
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
