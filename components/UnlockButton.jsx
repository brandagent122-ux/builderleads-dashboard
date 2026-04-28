'use client'
import { useState, useEffect } from 'react'
import { supabase, getSession } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

const CACHE_KEY = 'bl_contact_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_VERSION = 2  // Increment to invalidate all old cached contacts

function getCachedContact(leadId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const entry = cache[leadId]
    if (!entry) return null
    // Invalidate old cache entries without version or old version
    if (!entry.version || entry.version < CACHE_VERSION) {
      delete cache[leadId]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      return null
    }
    if (entry.expires && Date.now() > entry.expires) {
      delete cache[leadId]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      return null
    }
    return entry.persons || entry
  } catch { return null }
}

function setCachedContact(leadId, persons) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    cache[leadId] = { persons, expires: Date.now() + CACHE_TTL_MS, version: CACHE_VERSION }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

function formatPhone(num) {
  if (!num || num.length !== 10) return num
  return `(${num.slice(0,3)}) ${num.slice(3,6)}-${num.slice(6)}`
}

function getInitials(name) {
  if (!name || name === 'Unknown') return '?'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  { bg: '#FF7A3D15', border: '#FF7A3D30', text: '#FF7A3D' },
  { bg: '#3b82f615', border: '#3b82f630', text: '#60a5fa' },
  { bg: '#a855f715', border: '#a855f730', text: '#c084fc' },
  { bg: '#14b8a615', border: '#14b8a630', text: '#2dd4bf' },
]

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

function CopyRow({ text, children }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e) {
    e.preventDefault()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div onClick={handleCopy} className="copy-row" style={{
      position: 'relative', cursor: 'pointer', padding: '6px 8px', margin: '0 -8px',
      borderRadius: 8, transition: 'background 0.15s',
    }}>
      <div style={{ paddingRight: 60 }}>{children}</div>
      <div className="copy-btn" style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        background: '#2a2a30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
        padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4,
        opacity: 0, transition: 'opacity 0.15s',
      }}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: copied ? '#4ade80' : '#888', letterSpacing: 0.5 }}>
          {copied ? 'Copied' : 'Copy'}
        </span>
      </div>
      <style>{`
        .copy-row:hover { background: rgba(255,255,255,0.04) !important; }
        .copy-row:hover .copy-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

function PersonCard({ person, colorIndex }) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const initials = getInitials(person.full_name)

  return (
    <div style={{
      background: 'var(--card, #212126)', borderRadius: 12, padding: 16,
      border: '1px solid rgba(255,255,255,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: color.bg, border: `1px solid ${color.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 14, color: color.text,
        }}>{initials}</div>
        <div>
          {person.full_name && person.full_name !== 'Unknown' && (
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f0' }}>{person.full_name}</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
            {person.property_owner && (
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 4, background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8020' }}>OWNER</span>
            )}
            {person.litigator && (
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 4, background: '#fbbf2415', color: '#fbbf24', border: '1px solid #fbbf2420' }}>LITIGATOR</span>
            )}
            {person.age && (
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: '#555560' }}>AGE {person.age}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {(person.phones && person.phones.length > 0) && (
          <div style={{ background: 'var(--card-sunk, #19191D)', borderRadius: 10, padding: 12 }}>
            <div className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: '#555560', marginBottom: 10 }}>PHONES (CLEAN)</div>
            {person.phones.map((p, j) => (
              <CopyRow key={j} text={formatPhone(p.number)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="font-mono" style={{ fontSize: 14, color: '#f0f0f0' }}>{formatPhone(p.number)}</div>
                    <div className="font-mono" style={{ fontSize: 9, color: '#555560', marginTop: 2 }}>
                      {p.type || 'Phone'}{p.carrier ? ` \u00B7 ${p.carrier}` : ''}
                    </div>
                  </div>
                  <span className="font-mono" style={{ fontSize: 8, letterSpacing: 1, padding: '2px 6px', borderRadius: 4, background: '#4ade8015', color: '#4ade80' }}>CLEAN</span>
                </div>
              </CopyRow>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {person.emails && person.emails.length > 0 && (
            <div style={{ background: 'var(--card-sunk, #19191D)', borderRadius: 10, padding: 12, flex: 1 }}>
              <div className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: '#555560', marginBottom: 10 }}>EMAILS</div>
              {person.emails.map((e, j) => (
                <CopyRow key={j} text={e.email}>
                  <div className="font-mono" style={{ fontSize: 12, color: '#FF7A3D' }}>{e.email}</div>
                </CopyRow>
              ))}
            </div>
          )}
          {person.mailing_address && person.mailing_address.street && (
            <div style={{ background: 'var(--card-sunk, #19191D)', borderRadius: 10, padding: 12 }}>
              <div className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: '#555560', marginBottom: 8 }}>MAILING ADDRESS</div>
              <CopyRow text={`${person.mailing_address.street}, ${person.mailing_address.city}, ${person.mailing_address.state} ${person.mailing_address.zip}`}>
                <div style={{ fontSize: 12, color: '#aaaaaa', lineHeight: 1.4 }}>
                  {person.mailing_address.street}<br/>
                  {person.mailing_address.city}, {person.mailing_address.state} {person.mailing_address.zip}
                </div>
              </CopyRow>
            </div>
          )}
        </div>

        {(!person.phones || person.phones.length === 0) && (!person.emails || person.emails.length === 0) && (
          <div style={{ gridColumn: '1 / -1', fontSize: 13, color: '#555560', padding: 12 }}>No clean contact data available.</div>
        )}
      </div>
    </div>
  )
}

export default function UnlockButton({ leadId, address }) {
  const [status, setStatus] = useState('idle')
  const [persons, setPersons] = useState(null)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState(null)
  const [dncFiltered, setDncFiltered] = useState(0)

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

    const session = await getSession()
    const resp = await fetch('/api/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        lead_id: leadId, address: streetAddr, city, state,
        zip: zip || undefined, user_id: userId, refetch: isRefetch || undefined,
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
    setDncFiltered(result.dnc_filtered || 0)
    setStatus('unlocked')
    setAlreadyUnlocked(true)
    setCachedContact(leadId, contactPersons)
    logActivity(isRefetch ? 'contact_refetched' : 'contact_unlocked', address, leadId)
  }

  // Previously unlocked, no cache (expired or cleared)
  if (alreadyUnlocked && !persons && status !== 'loading') {
    return (
      <div>
        <div style={{
          background: '#1B1B1F', borderRadius: 14, padding: 20,
          border: '1px solid rgba(255,255,255,0.04)', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#555560' }}></div>
            <span className="font-mono" style={{ fontSize: 10, letterSpacing: 2, color: '#555560', fontWeight: 600 }}>PREVIOUSLY UNLOCKED</span>
          </div>
          <div style={{ fontSize: 13, color: '#777' }}>Contact data expires after 24 hours. Re-fetch to view again.</div>
        </div>
        <button onClick={() => doUnlock(true)} className="btn-ghost w-full"
          style={{ padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Re-fetch Contact Info (5 credits)
          </span>
        </button>
        {error && <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  // Show contact data
  if (status === 'unlocked' && persons) {
    return (
      <div style={{
        background: '#1B1B1F', borderRadius: 14, padding: 20,
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }}></div>
            <span className="font-mono" style={{ fontSize: 10, letterSpacing: 2, color: '#4ade80', fontWeight: 600 }}>CONTACT INFO</span>
          </div>
          <span className="font-mono" style={{ fontSize: 10, color: '#555560' }}>NOT STORED ON SERVER</span>
        </div>

        {persons.length === 0 && (
          <div style={{ fontSize: 13, color: '#555560', padding: 12 }}>No clean contact data found for this address.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {persons.map((person, i) => (
            <PersonCard key={i} person={person} colorIndex={i} />
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: '#4ade80' }}>DNC FILTER VERIFIED</span>
          </div>
          {dncFiltered > 0 && <div style={{ fontSize: 11, color: '#f87171', marginBottom: 4 }}>{dncFiltered} DNC number{dncFiltered > 1 ? 's' : ''} removed server-side. Not shown.</div>}
          <div style={{ fontSize: 10, color: '#555560' }}>
            All phone numbers verified against Do-Not-Call registry before display. Contact data auto-expires in 24 hours.
          </div>
        </div>
      </div>
    )
  }

  // Loading
  if (status === 'loading') {
    return (
      <button disabled className="btn-ember w-full" style={{ padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600, opacity: 0.6 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          Looking up owner...
        </span>
      </button>
    )
  }

  // Default unlock button
  return (
    <div>
      <button onClick={() => doUnlock(false)} className="btn-ember w-full"
        style={{ padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Unlock Contact Info (5 credits)
        </span>
      </button>
      {error && <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
