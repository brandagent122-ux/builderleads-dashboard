'use client'
import { useState, useEffect } from 'react'
import { supabase, getAllProfiles, updateProfile, getSession, getProfile } from '@/lib/supabase'

const TIERS = ['starter', 'pro', 'enterprise']
const TRADES = ['Builders/GC', 'Plumbing', 'HVAC', 'Electrical', 'Roofing', 'Solar', 'Landscape/Pool', 'Public Adjusters']
const TIER_LIMITS = {
  starter: { max_leads: 50, max_unlocks: 0 },
  pro: { max_leads: 500, max_unlocks: 50 },
  enterprise: { max_leads: 99999, max_unlocks: 99999 },
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editing, setEditing] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const session = await getSession()
      if (!session) return
      const profile = await getProfile(session.user.id)
      if (profile?.role !== 'admin') {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setIsAdmin(true)
      const data = await getAllProfiles()
      setProfiles(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreateUser() {
    if (!newEmail || !newPassword) return
    setCreating(true)
    setMessage('')

    const { data, error } = await supabase.auth.admin?.createUser?.({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
    })

    if (error) {
      // Fallback: use signUp
      const { data: signData, error: signError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      })
      if (signError) {
        setMessage(`Error: ${signError.message}`)
        setCreating(false)
        return
      }
      setMessage(`Account created for ${newEmail}. They can now log in.`)
    } else {
      setMessage(`Account created for ${newEmail}.`)
    }

    setNewEmail('')
    setNewPassword('')
    setCreating(false)

    // Refresh profiles
    const updated = await getAllProfiles()
    setProfiles(updated)
  }

  async function handleUpdateTier(userId, tier) {
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.starter
    await updateProfile(userId, { tier, ...limits })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, tier, ...limits } : p))
    setMessage(`Tier updated to ${tier}`)
  }

  async function handleUpdateTrade(userId, trade) {
    await updateProfile(userId, { trade })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, trade } : p))
  }

  async function handleToggleAccess(userId, currentRole) {
    const newRole = currentRole === 'client' ? 'admin' : 'client'
    await updateProfile(userId, { role: newRole })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p))
  }

  if (loading) {
    return (
      <div className="px-2">
        <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Admin Dashboard</h1>
        <div className="mt-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20" style={{ borderRadius: 'var(--r-card, 22px)' }} />)}
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="px-2">
        <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Access Denied</h1>
        <p className="text-ink-2 mt-2">You do not have admin privileges.</p>
      </div>
    )
  }

  const clients = profiles.filter(p => p.role === 'client')
  const admins = profiles.filter(p => p.role === 'admin')

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Admin Dashboard</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {profiles.length} ACCOUNTS \u00B7 {clients.length} CLIENTS \u00B7 {admins.length} ADMINS
          </p>
        </div>
      </div>

      {message && (
        <div className="card-raised p-3 mb-4 text-sm text-green-400" style={{ borderRadius: 14 }}>
          {message}
        </div>
      )}

      {/* Create new user */}
      <div className="card-raised p-5 mb-6" style={{ borderRadius: 'var(--r-card, 22px)' }}>
        <h2 className="text-sm font-semibold text-ink-0 mb-4">Create New Client Account</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">EMAIL</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="contractor@company.com"
              className="input-sunk w-full"
              style={{ padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <div className="flex-1">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">PASSWORD</label>
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-sunk w-full"
              style={{ padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <button
            onClick={handleCreateUser}
            disabled={creating || !newEmail || !newPassword}
            className="btn-ember"
            style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, opacity: creating ? 0.5 : 1, whiteSpace: 'nowrap' }}
          >
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {profiles.map(profile => (
          <div key={profile.id} className="card-raised p-5" style={{ borderRadius: 'var(--r-card, 22px)' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[15px] font-semibold text-ink-0">{profile.email}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    profile.role === 'admin' ? 'bg-[rgba(255,122,61,0.15)] text-ember' : 'bg-[rgba(96,165,250,0.15)] text-[#60a5fa]'
                  }`}>
                    {profile.role?.toUpperCase()}
                  </span>
                  {profile.tos_accepted_at ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-green-400">TOS ACCEPTED</span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[rgba(248,113,113,0.15)] text-red-400">TOS PENDING</span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-ink-2 flex gap-4">
                  <span>Company: {profile.company_name || '-'}</span>
                  <span>Trade: {profile.trade || '-'}</span>
                  <span>Tier: {profile.tier}</span>
                  <span>Credits: {profile.credits}/{profile.max_unlocks}</span>
                  <span>Leads: {profile.max_leads}</span>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={profile.tier}
                  onChange={e => handleUpdateTier(profile.id, e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--card-sunk, #19191D)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                  value={profile.trade || ''}
                  onChange={e => handleUpdateTrade(profile.id, e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--card-sunk, #19191D)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
                >
                  <option value="">No trade</option>
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
