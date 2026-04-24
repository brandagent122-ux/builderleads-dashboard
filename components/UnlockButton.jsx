'use client'
import { useState, useEffect } from 'react'
import { supabase, getSession } from '@/lib/supabase'

const CACHE_KEY = 'bl_contact_cache'

function getCachedContact(leadId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return cache[leadId] || null
  } catch { return null }
}

function setCachedContact(leadId, persons) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    cache[leadId] = persons
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

export default function UnlockButton({ leadId, address }) {
  const [status, setStatus] = useState('idle')
  const [persons, setPersons] = useState(null)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState(null)

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
        if (data) {
          setAlreadyUnlocked(true)
          const cached = getCachedContact(leadId)
          if (cached) {
            setPersons(cached)
            setStatus('unlocked')
          }
        }
      }
    }
    init()
  }, [leadId])

  async function doUnlock(isRefetch) {
    if (!userId || status === 'loading') return
    setStatus('loading')
    setError('')

    const parts = address.split(',').map(s => s.trim())
    const streetAddr = parts[0] || address
    const city = parts[1] || 'Pacific Palisades'
    const stateZip = parts[2] || 'CA'
    const stateParts = stateZip.split(' ')
    const state = stateParts[0] || 'CA'
    const zip = stateParts[1] || ''

    const resp = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        address: streetAddr,
        city,
        state,
        zip: zip || undefined,
        user_id: userId,
        refetch: isRefetch || undefined,
      }),
    })

    const result = await resp.json()

    if (result.error) {
      setError(result.error)
      setStatus('error')
      return
    }

    const contactPersons = result.persons || []
    setPersons(contactPersons)
    setCreditsRemaining(result.credits_remaining)
    setStatus('unlocked')
    setAlreadyUnlocked(true)

    setCachedContact(leadId, contactPersons)
  }

  // Previously unlocked but no cached data
  if (alreadyUnlocked && !persons && status !== 'loading') {
    return (
      <div>
        <div style={{
          padding: 16, borderRadius: 14,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          marginBottom: 12,
        }}>
          <div className="font-mono text-[10px] text-green-400 tracking-wider mb-1">PREVIOUSLY UNLOCKED</div>
          <div className="text-[13px] text-ink-2">Contact data is not stored on our servers. Re-fetch from Tracerfy to view again.</div>
        </div>
        <button
          onClick={() => doUnlock(true)}
          className="btn-ghost w-full"
          style={{ padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 600 }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Re-fetch Contact Info (free)
          </span>
        </button>
        {error && <div className="text-red-400 text-[12px] text-center mt-2">{error}</div>}
      </div>
    )
  }

  // Show contact data
  if (status === 'unlocked' && persons) {
    return (
      <div style={{
        padding: 20, borderRadius: 16,
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] text-green-400 tracking-wider">CONTACT INFO (NOT STORED)</div>
          {creditsRemaining != null && (
            <div className="font-mono text-[10px] text-ink-3">{creditsRemaining} credits left</div>
          )}
        </div>

        {persons.length === 0 && (
          <div className="text-[13px] text-ink-2">No contact data found for this address.</div>
        )}

        {persons.map((person, i) => (
          <div key={i} className="mb-5 last:mb-0">
            {person.full_name && person.full_name !== 'Unknown' && (
              <div className="text-[16px] font-semibold text-ink-0 mb-1">{person.full_name}</div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {person.property_owner && (
                <span className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>OWNER</span>
              )}
              {person.deceased && (
                <span className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>DECEASED</span>
              )}
              {person.litigator && (
                <span className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>LITIGATOR</span>
              )}
              {person.age && (
                <span className="font-mono text-[9px] tracking-wider text-ink-3">AGE {person.age}</span>
              )}
            </div>

            {person.phones && person.phones.length > 0 && (
              <div className="mb-3">
                <div className="font-mono text-[10px] text-ink-3 mb-1.5">PHONES</div>
                {person.phones.map((p, j) => (
                  <div key={j} className="flex items-center gap-3 mb-1">
                    <a href={`tel:${p.number}`} className="text-[14px] text-ink-0 font-mono hover:text-accent transition-colors">
                      {formatPhone(p.number)}
                    </a>
                    {p.type && (
                      <span className="font-mono text-[9px] tracking-wider text-ink-3 px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--card-sunk)' }}>{p.type}</span>
                    )}
                    {p.dnc && (
                      <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>DNC</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {person.emails && person.emails.length > 0 && (
              <div className="mb-3">
                <div className="font-mono text-[10px] text-ink-3 mb-1.5">EMAILS</div>
                {person.emails.map((e, j) => (
                  <a key={j} href={`mailto:${e.email}`}
                    className="text-[14px] text-ink-0 font-mono mb-1 block hover:text-accent transition-colors">
                    {e.email}
                  </a>
                ))}
              </div>
            )}

            {person.mailing_address && person.mailing_address.street && (
              <div>
                <div className="font-mono text-[10px] text-ink-3 mb-1">MAILING ADDRESS</div>
                <div className="text-[13px] text-ink-2">
                  {person.mailing_address.street}, {person.mailing_address.city}, {person.mailing_address.state} {person.mailing_address.zip}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="mt-4 pt-3 text-[11px] text-ink-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          This data is provided by a third-party service and is not stored by BuilderLeads.
        </div>
      </div>
    )
  }

  // Loading state
  if (status === 'loading') {
    return (
      <button disabled className="btn-ember w-full" style={{ padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, opacity: 0.6 }}>
        <span className="flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Looking up owner...
        </span>
      </button>
    )
  }

  // Default: unlock button
  return (
    <div>
      <button
        onClick={() => doUnlock(false)}
        className="btn-ember w-full"
        style={{ padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600 }}
      >
        <span className="flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Unlock Contact Info (2 credits)
        </span>
      </button>
      {error && <div className="text-red-400 text-[12px] text-center mt-2">{error}</div>}
    </div>
  )
}

function formatPhone(num) {
  if (!num || num.length !== 10) return num
  return `(${num.slice(0,3)}) ${num.slice(3,6)}-${num.slice(6)}`
}
