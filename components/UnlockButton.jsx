'use client'
import { useState, useEffect } from 'react'
import { supabase, getSession } from '@/lib/supabase'

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
        if (data) setAlreadyUnlocked(true)
      }
    }
    init()
  }, [leadId])

  async function handleUnlock(isRefetch) {
    if (!userId || status === 'loading') return
    setStatus('loading')
    setError('')

    const parts = address.split(',').map(s => s.trim())
    const streetAddr = parts[0] || address
    const city = parts[1] || 'Los Angeles'
    const stateZip = parts[2] || 'CA'
    const stateParts = stateZip.split(' ')
    const state = stateParts[0] || 'CA'
    const zip = stateParts[1] || ''

    const session = await getSession()
    const resp = await fetch('/api/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
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

    setPersons(result.persons || [])
    setCreditsRemaining(result.credits_remaining)
    setStatus('unlocked')
    setAlreadyUnlocked(true)
  }

  if (alreadyUnlocked && !persons && status !== 'loading') {
    return (
      <div>
        <div style={{
          padding: 16, borderRadius: 14, marginBottom: 12,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <div className="font-mono text-[10px] text-green-400 tracking-wider mb-1">PREVIOUSLY UNLOCKED</div>
          <div className="text-[13px] text-ink-2">Contact data is not stored. Re-fetch to view again.</div>
        </div>
        <button
          onClick={() => handleUnlock(true)}
          disabled={status === 'loading'}
          className="btn-ghost w-full"
          style={{ padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 600 }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Re-fetch Contact Info (no extra charge)
          </span>
        </button>
        {error && <div className="text-red-400 text-[12px] text-center mt-2">{error}</div>}
      </div>
    )
  }

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
            {/* Name */}
            {person.full_name && (
              <div className="text-[16px] font-semibold text-ink-0 mb-1">{person.full_name}</div>
            )}

            {/* Tags row */}
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

            {/* Phones - only show verified (fallback: show all if none verified) */}
            {(() => {
              const allPhones = person.phones || []
              const verifiedPhones = allPhones.filter(p => p.verified)
              const displayPhones = verifiedPhones.length > 0 ? verifiedPhones : allPhones
              const isVerified = verifiedPhones.length > 0
              return displayPhones.length > 0 && (
                <div className="mb-3">
                  <div className="font-mono text-[10px] text-ink-3 mb-1.5">{isVerified ? 'VERIFIED PHONES' : 'PHONES'}</div>
                  {displayPhones.map((p, j) => (
                    <div key={j} className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <a href={`tel:${p.number}`} className="text-[14px] text-ink-0 font-mono hover:text-accent transition-colors">
                        {formatPhone(p.number)}
                      </a>
                      {p.verified && (
                        <span className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.12)' }}>VERIFIED</span>
                      )}
                      {p.is_mobile && (
                        <span className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.12)' }}>MOBILE</span>
                      )}
                      {!p.is_mobile && p.line_type && (
                        <span className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#555', border: '1px solid rgba(255,255,255,0.06)' }}>{(p.line_type || '').toUpperCase()}</span>
                      )}
                      {p.carrier && (
                        <span className="font-mono text-[8px] text-ink-3">{p.carrier}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Emails - only show deliverable (fallback: show all if none verified) */}
            {(() => {
              const allEmails = person.emails || []
              const goodEmails = allEmails.filter(e => e.deliverable)
              const displayEmails = goodEmails.length > 0 ? goodEmails : allEmails.filter(e => !e.invalid)
              const isVerified = goodEmails.length > 0
              return displayEmails.length > 0 && (
                <div className="mb-3">
                  <div className="font-mono text-[10px] text-ink-3 mb-1.5">{isVerified ? 'VERIFIED EMAILS' : 'EMAILS'}</div>
                  {displayEmails.map((e, j) => (
                    <div key={j} className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <a href={`mailto:${e.email}`}
                        className="text-[14px] text-ink-0 font-mono hover:text-accent transition-colors">
                        {e.email}
                      </a>
                      {e.deliverable && (
                        <span className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.12)' }}>DELIVERABLE</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Mailing address */}
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

        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span className="font-mono text-[9px] text-green-400 tracking-wider">DNC FILTER VERIFIED</span>
          </div>
          <div className="text-[11px] text-ink-3">Contact data is fetched live and not stored by BuilderLeads.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => handleUnlock(false)}
        disabled={status === 'loading'}
        className="btn-ember w-full"
        style={{ padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600, opacity: status === 'loading' ? 0.6 : 1 }}
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            Looking up owner...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Unlock Contact Info (5 credits)
          </span>
        )}
      </button>
      {error && <div className="text-red-400 text-[12px] text-center mt-2">{error}</div>}
    </div>
  )
}

function formatPhone(num) {
  if (!num || num.length !== 10) return num
  return `(${num.slice(0,3)}) ${num.slice(3,6)}-${num.slice(6)}`
}
