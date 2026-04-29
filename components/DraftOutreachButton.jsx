'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DraftOutreachButton({ leadId, address }) {
  const [clicked, setClicked] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (clicked) return
    setClicked(true)
    // Store the request, let outreach page handle the API call
    localStorage.setItem('bl_draft_request', JSON.stringify({
      lead_id: leadId,
      address: address || '',
      ts: Date.now(),
    }))
    router.push('/outreach')
  }

  return (
    <button
      onClick={handleClick}
      disabled={clicked}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 10,
        background: clicked ? '#FF7A3D20' : '#FF7A3D15',
        border: '1px solid #FF7A3D25',
        color: '#FF7A3D', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
        cursor: clicked ? 'wait' : 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!clicked) e.target.style.background = '#FF7A3D25' }}
      onMouseLeave={e => { if (!clicked) e.target.style.background = '#FF7A3D15' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Draft Outreach
    </button>
  )
}
