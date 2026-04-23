'use client'
import { useState } from 'react'
import { signIn } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: err } = await signIn(email, password)

    if (err) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--page, #141416)',
    }}>
      <div style={{
        width: 400,
        padding: 40,
        borderRadius: 24,
        background: 'var(--stage, #1B1B1F)',
        boxShadow: '8px 8px 20px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--ember, #FF7A3D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#000',
          }}>B</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>BuilderLeads</div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ember, #FF7A3D)', letterSpacing: '2px' }}>PALISADES FIRE INTEL</div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2, #8B8B96)', marginBottom: 28 }}>Sign in to your account</div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-3, #555560)', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', fontSize: 14, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-3, #555560)', display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', paddingRight: 48, borderRadius: 14, border: 'none', fontSize: 14, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8B96" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8B96" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-ember"
            style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-3, #555560)', letterSpacing: '1.5px' }}>
          POWERED BY RU4REELZ
        </div>
      </div>
    </div>
  )
}