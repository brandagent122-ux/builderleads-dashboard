'use client'
import { useState, useEffect } from 'react'
import { supabase, getSession } from '@/lib/supabase'

export default function UnlockButton({ leadId, address }) {
  const [status, setStatus] = useState('idle')
  const [contact, setContact] = useState(null)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false)

  useEffect(() => {
    async function init() {
      const session = await getSession()
      if (session) {
        setUserId(session.user.id)
        const { data } = await supabase
          .from('unlocks')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('lead_id', leadId)
          .single()
        if (data) setAlreadyUnlocked(true)
      }
    }
    init()
  }, [leadId])

  async function handleUnlock() {
    if (!userId || status === 'loading') return
    setStatus('loading')
    setError('')

    const parts = address.split(',').map(s => s.trim())
    const streetAddr = parts[0] || address
    const city = parts[1] || 'Pacific Palisades'
    const stateZip = parts[2] || 'CA'
    const state = stateZip.split(' ')[0] || 'CA'

    const resp = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        address: streetAddr,
        city,
        state,
        user_id: userId,
      }),
    })

    const result = await resp.json()

    if (result.error) {
      setError(result.error)
      setStatus('error')
      return
    }

    setContact(result.contact)
    setStatus('unlocked')
    setAlreadyUnlocked(true)
  }

  if (alreadyUnlocked && !contact) {
    return (
      <div style={{
        padding: 16, borderRadius: 14,
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
        <div className="font-mono text-[10px] text-green-400 tracking-wider mb-1">CONTACT UNLOCKED</div>
        <div className="text-[13px] text-ink-2">Contact info was previously unlocked for this lead. Data is not stored permanently.</div>
      </div>
    )
  }

  if (status === 'unlocked' && contact) {
    const people = contact.people || contact.results || [contact]
    return (
      <div style={{
        padding: 20, borderRadius: 16,
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] text-green-400 tracking-wider">CONTACT INFO (NOT STORED)</div>
          <div className="font-mono text-[10px] text-ink-3">{contact.credits_remaining != null ? `${contact.credits_remaining} credits left` : ''}</div>
        </div>
        {people.map((person, i) => (
          <div key={i} className="mb-4 last:mb-0">
            {person.name && (
              <div className="text-[16px] font-semibold text-ink-0 mb-2">
                {person.first_name || ''} {person.last_name || person.name || ''}
              </div>
            )}
            {person.phones && person.phones.length > 0 && (
              <div className="mb-2">
                <div className="font-mono text-[10px] text-ink-3 mb-1">PHONES</div>
                {person.phones.map((p, j) => (
                  <div key={j} className="flex items-center gap-3 mb-1">
                    <span className="text-[14px] text-ink-0 font-mono">{p.phone || p.number || p}</span>
                    {p.type && <span className="font-mono text-[10px] text-ink-3">{p.type}</span>}
                    {p.dnc && <span className="font-mono text-[10px] text-red-400 px-1.5 py-0.5 rounded bg-[rgba(248,113,113,0.1)]">DNC</span>}
                  </div>
                ))}
              </div>
            )}
            {person.emails && person.emails.length > 0 && (
              <div className="mb-2">
                <div className="font-mono text-[10px] text-ink-3 mb-1">EMAILS</div>
                {person.emails.map((e, j) => (
                  <div key={j} className="text-[14px] text-ink-0 font-mono mb-1">{e.email || e}</div>
                ))}
              </div>
            )}
            {(person.address || person.mailing_address) && (
              <div>
                <div className="font-mono text-[10px] text-ink-3 mb-1">MAILING ADDRESS</div>
                <div className="text-[13px] text-ink-2">{person.address || person.mailing_address}</div>
              </div>
            )}
          </div>
        ))}
        <div className="mt-3 text-[11px] text-ink-3">This data is provided by a third-party service. Not stored by this platform.</div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleUnlock}
        disabled={status === 'loading'}
        className="btn-ember w-full"
        style={{ padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, opacity: status === 'loading' ? 0.6 : 1 }}
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            Unlocking contact info...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Unlock Contact Info (1 credit)
          </span>
        )}
      </button>
      {error && <div className="text-red-400 text-[12px] text-center mt-2">{error}</div>}
    </div>
  )
}