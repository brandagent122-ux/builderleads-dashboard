'use client'
import { useState } from 'react'
import { getSession } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DraftOutreachButton({ leadId }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDraft() {
    if (status === 'loading') return
    setStatus('loading')
    setError('')

    try {
      const session = await getSession()
      const resp = await fetch('/api/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      })

      const result = await resp.json()

      if (result.error) {
        setError(result.error)
        setStatus('error')
        return
      }

      setStatus('done')
      // Redirect to outreach page after brief success animation
      setTimeout(() => {
        router.push('/outreach')
      }, 1200)

    } catch (err) {
      setError('Failed to generate draft')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <button disabled style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 10,
        background: '#4ade8015', border: '1px solid #4ade8025',
        color: '#4ade80', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
        cursor: 'default',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Draft created
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={handleDraft}
        disabled={status === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 10,
          background: status === 'loading' ? '#FF7A3D20' : '#FF7A3D15',
          border: '1px solid #FF7A3D25',
          color: '#FF7A3D', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
          cursor: status === 'loading' ? 'wait' : 'pointer',
          transition: 'all 0.15s',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (status !== 'loading') e.target.style.background = '#FF7A3D25' }}
        onMouseLeave={e => { if (status !== 'loading') e.target.style.background = '#FF7A3D15' }}
      >
        {status === 'loading' ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            Drafting...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Draft Outreach
          </>
        )}
      </button>
      {error && <div style={{ color: '#f87171', fontSize: 10, marginTop: 4 }}>{error}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
