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
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newMaxLeads, setNewMaxLeads] = useState('50')
  const [newTrade, setNewTrade] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [managingLeads, setManagingLeads] = useState(null)
  const [tab, setTab] = useState('all')

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

    try {
      const resp = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          company_name: newCompany || undefined,
          max_leads: parseInt(newMaxLeads) || 50,
          trade: newTrade || undefined,
        }),
      })

      const result = await resp.json()

      if (result.error) {
        setMessage('Error: ' + result.error)
        setCreating(false)
        return
      }

      setMessage('Account created for ' + newEmail)
      setNewEmail('')
      setNewPassword('')
      setNewCompany('')
      setNewMaxLeads('50')
      setNewTrade('')
      setCreating(false)

      // Refresh
      setTimeout(async () => {
        const updated = await getAllProfiles()
        setProfiles(updated)
      }, 1500)
    } catch (err) {
      setMessage('Error: ' + err.message)
      setCreating(false)
    }
  }

  async function handleUpdateTier(userId, tier) {
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.starter
    await updateProfile(userId, { tier, ...limits })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, tier, ...limits } : p))
    flash('Tier updated')
  }

  async function handleUpdateTrade(userId, trade) {
    await updateProfile(userId, { trade })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, trade } : p))
  }

  async function handlePause(userId, currentRole) {
    const newRole = currentRole === 'paused' ? 'client' : 'paused'
    await updateProfile(userId, { role: newRole })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p))
    flash(newRole === 'paused' ? 'Account paused' : 'Account reactivated')
  }

  async function handleResetCredits(userId) {
    const profile = profiles.find(p => p.id === userId)
    const maxUnlocks = TIER_LIMITS[profile?.tier]?.max_unlocks || 0
    await updateProfile(userId, { contact_unlocks: 0, credits: maxUnlocks })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, contact_unlocks: 0, credits: maxUnlocks } : p))
    flash('Credits reset')
  }

  async function handleDelete(userId) {
    // Delete profile first, then auth user
    await supabase.from('profiles').delete().eq('id', userId)
    // Note: deleting from auth.users requires service role key (done via Supabase dashboard)
    setProfiles(profiles.filter(p => p.id !== userId))
    setConfirmDelete(null)
    flash('Account removed from dashboard. Delete from Supabase Auth > Users to fully remove.')
  }

  async function handleUpdateCompany(userId, company) {
    await updateProfile(userId, { company_name: company })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, company_name: company } : p))
  }

  async function handleUpdateZips(userId, zips) {
    const zipArray = zips.split(',').map(z => z.trim()).filter(Boolean)
    await updateProfile(userId, { territory_zips: zipArray })
    setProfiles(profiles.map(p => p.id === userId ? { ...p, territory_zips: zipArray } : p))
    flash('Territory updated')
  }

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
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
  const paused = profiles.filter(p => p.role === 'paused')
  const admins = profiles.filter(p => p.role === 'admin')

  const filtered = tab === 'all' ? profiles : tab === 'clients' ? clients : tab === 'paused' ? paused : admins

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-0 tracking-tight">Admin Dashboard</h1>
          <p className="font-mono text-[12px] text-ink-2 mt-1 tracking-wider uppercase">
            {profiles.length} ACCOUNTS {'\u00B7'} {clients.length} ACTIVE {'\u00B7'} {paused.length} PAUSED {'\u00B7'} {admins.length} ADMINS
          </p>
        </div>
      </div>

      {message && (
        <div className="card-raised p-3 mb-4 text-sm text-green-400" style={{ borderRadius: 14, border: '1px solid rgba(34,197,94,0.2)' }}>
          {message}
        </div>
      )}

      {/* Create new user */}
      <div className="card-raised p-5 mb-6" style={{ borderRadius: 'var(--r-card, 22px)' }}>
        <h2 className="text-sm font-semibold text-ink-0 mb-4">Create New Client Account</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">EMAIL</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="contractor@company.com"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">PASSWORD</label>
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Temp password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">COMPANY</label>
            <input
              type="text"
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              placeholder="Company name"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <div className="min-w-[100px]" style={{ width: 100 }}>
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">MAX LEADS</label>
            <input
              type="number"
              value={newMaxLeads}
              onChange={e => setNewMaxLeads(e.target.value)}
              placeholder="50"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="font-mono text-[10px] text-ink-3 tracking-wider block mb-1">TRADE</label>
            <select
              value={newTrade}
              onChange={e => setNewTrade(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 13, color: '#fff', background: 'var(--card-sunk, #19191D)', outline: 'none' }}
            >
              <option value="">Select trade</option>
              {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: profiles.length },
          { key: 'clients', label: 'Active', count: clients.length },
          { key: 'paused', label: 'Paused', count: paused.length },
          { key: 'admins', label: 'Admins', count: admins.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-[12px] font-mono font-medium transition-all ${
              tab === t.key
                ? 'bg-[var(--card,#212126)] text-ember shadow-[4px_4px_10px_rgba(0,0,0,0.35),_-3px_-3px_8px_rgba(255,255,255,0.025)]'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {filtered.map(profile => (
          <div key={profile.id} className="card-raised p-5" style={{
            borderRadius: 'var(--r-card, 22px)',
            opacity: profile.role === 'paused' ? 0.5 : 1,
            border: profile.role === 'paused' ? '1px solid rgba(248,113,113,0.2)' : 'none',
          }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-ink-0">{profile.email}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    profile.role === 'admin' ? 'bg-[rgba(255,122,61,0.15)] text-ember' :
                    profile.role === 'paused' ? 'bg-[rgba(248,113,113,0.15)] text-red-400' :
                    'bg-[rgba(96,165,250,0.15)] text-[#60a5fa]'
                  }`}>
                    {profile.role === 'paused' ? 'PAUSED' : profile.role?.toUpperCase()}
                  </span>
                  {profile.tos_accepted_at ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-green-400">TOS ACCEPTED</span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[rgba(248,113,113,0.15)] text-red-400">TOS PENDING</span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-ink-2 flex gap-4 flex-wrap">
                  <span>Company: {profile.company_name || '-'}</span>
                  <span>Trade: {profile.trade || '-'}</span>
                  <span>Tier: {profile.tier}</span>
                  <span>Unlocks: {profile.contact_unlocks || 0}/{profile.max_unlocks || 0}</span>
                  <span>Max leads: {profile.max_leads}</span>
                  {profile.territory_zips?.length > 0 && (
                    <span>Zips: {profile.territory_zips.join(', ')}</span>
                  )}
                </div>
              </div>

              {profile.role !== 'admin' && (
                <div className="flex gap-2 items-center flex-shrink-0 flex-wrap">
                  <select
                    value={profile.tier}
                    onChange={e => handleUpdateTier(profile.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'var(--card-sunk, #19191D)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
                  >
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <select
                    value={profile.trade || ''}
                    onChange={e => handleUpdateTrade(profile.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'var(--card-sunk, #19191D)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
                  >
                    <option value="">No trade</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <button
                    onClick={() => handlePause(profile.id, profile.role)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: profile.role === 'paused' ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.15)',
                      color: profile.role === 'paused' ? '#22c55e' : '#f87171',
                    }}
                  >
                    {profile.role === 'paused' ? 'Reactivate' : 'Pause'}
                  </button>

                  <button
                    onClick={() => handleResetCredits(profile.id)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}
                  >
                    Reset credits
                  </button>

                  {confirmDelete === profile.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(profile.id)}
                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#f87171', color: '#fff' }}
                      >
                        Confirm delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#8B8B96' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(profile.id)}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', color: '#f87171' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Territory editor for non-admins */}
            {profile.role !== 'admin' && (
              <div className="mt-3 flex gap-2 items-center">
                <label className="font-mono text-[10px] text-ink-3">TERRITORY ZIPS:</label>
                <input
                  type="text"
                  defaultValue={profile.territory_zips?.join(', ') || ''}
                  onBlur={e => handleUpdateZips(profile.id, e.target.value)}
                  placeholder="90272, 90049, 90402"
                  style={{ flex: 1, maxWidth: 300, padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'var(--card-sunk, #19191D)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
                />
              </div>
            )}

            {/* Manage Leads button */}
            {profile.role !== 'admin' && (
              <div className="mt-3">
                <button
                  onClick={() => setManagingLeads(managingLeads === profile.id ? null : profile.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: managingLeads === profile.id ? 'rgba(255,122,61,0.2)' : 'rgba(255,122,61,0.1)',
                    color: '#FF7A3D',
                  }}
                >
                  {managingLeads === profile.id ? 'Close Lead Manager' : 'Manage Leads'}
                </button>
              </div>
            )}

            {/* Lead Manager Panel */}
            {managingLeads === profile.id && (
              <ManageLeadsPanel userId={profile.id} onUpdate={() => flash('Leads updated')} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ManageLeadsPanel({ userId, onUpdate }) {
  const [assigned, setAssigned] = useState([])
  const [available, setAvailable] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [visibleAvail, setVisibleAvail] = useState(30)

  const SCORE_FILTERS = [
    { key: 'all', label: 'All', min: 0, max: 100 },
    { key: '90+', label: '90+', min: 90, max: 100 },
    { key: '75-89', label: '75-89', min: 75, max: 89 },
    { key: '50-74', label: '50-74', min: 50, max: 74 },
    { key: '<50', label: 'Under 50', min: 0, max: 49 },
  ]

  useEffect(() => { loadAssigned() }, [])
  useEffect(() => { searchAvailable() }, [search, scoreFilter])

  async function loadAssigned() {
    const resp = await fetch(`/api/admin/leads?user_id=${userId}`)
    const data = await resp.json()
    setAssigned(data.assigned || [])
    setLoading(false)
  }

  async function searchAvailable() {
    const f = SCORE_FILTERS.find(s => s.key === scoreFilter) || SCORE_FILTERS[0]
    const params = new URLSearchParams({ min_score: f.min, max_score: f.max, limit: 200 })
    if (search) params.set('search', search)
    const resp = await fetch(`/api/admin/leads/search?${params}`)
    const data = await resp.json()
    setAvailable(data.leads || [])
    setVisibleAvail(30)
  }

  async function handleAssign() {
    if (selected.size === 0) return
    setBusy(true)
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', user_id: userId, lead_ids: [...selected] }),
    })
    setSelected(new Set())
    await loadAssigned()
    setBusy(false)
    onUpdate()
  }

  async function handleRemove(leadId) {
    setBusy(true)
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', user_id: userId, lead_ids: [leadId] }),
    })
    await loadAssigned()
    setBusy(false)
    onUpdate()
  }

  async function handlePreset(preset) {
    setBusy(true)
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preset', user_id: userId, preset, count: 10 }),
    })
    await loadAssigned()
    setBusy(false)
    onUpdate()
  }

  async function handleClear() {
    setBusy(true)
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', user_id: userId }),
    })
    await loadAssigned()
    setBusy(false)
    onUpdate()
  }

  function toggleSelect(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const assignedIds = new Set(assigned.map(a => a.id))

  function scoreColor(score) {
    if (score >= 85) return '#FF7A3D'
    if (score >= 75) return '#fbbf24'
    if (score >= 50) return '#60a5fa'
    return '#555560'
  }

  if (loading) return <div className="mt-4 text-[12px] text-ink-3">Loading lead assignments...</div>

  return (
    <div className="mt-4" style={{ background: 'var(--card-sunk, #19191D)', borderRadius: 14, padding: 16 }}>
      {/* Assigned leads */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] text-ink-3 tracking-wider">ASSIGNED LEADS ({assigned.length})</div>
        {assigned.length > 0 && (
          <button onClick={handleClear} disabled={busy}
            style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
            Clear all
          </button>
        )}
      </div>

      {assigned.length === 0 ? (
        <div className="text-[12px] text-ink-3 mb-4">No leads assigned yet.</div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {assigned.map(lead => (
            <div key={lead.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
              background: 'var(--card, #212126)', borderRadius: 8, fontSize: 11,
            }}>
              <span style={{ color: scoreColor(lead.score), fontFamily: 'monospace', fontWeight: 600, minWidth: 20 }}>{lead.score}</span>
              <span className="text-ink-1" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.address}</span>
              <button onClick={() => handleRemove(lead.id)} disabled={busy}
                style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick presets */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[10px] text-ink-3">QUICK ASSIGN:</span>
        <button onClick={() => handlePreset('top')} disabled={busy}
          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(255,122,61,0.15)', color: '#FF7A3D' }}>
          Top 10
        </button>
        <button onClick={() => handlePreset('random_mix')} disabled={busy}
          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
          Random mix
        </button>
        <button onClick={() => handlePreset('warm_only')} disabled={busy}
          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
          Warm only
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search address..."
          style={{ flex: 1, maxWidth: 250, padding: '6px 10px', borderRadius: 8, fontSize: 11, background: 'var(--card, #212126)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', outline: 'none' }}
        />
        <div className="flex gap-1">
          {SCORE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setScoreFilter(f.key)}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: scoreFilter === f.key ? 'var(--card, #212126)' : 'transparent',
                color: scoreFilter === f.key ? '#FF7A3D' : '#555560',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Available leads */}
      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        {available.filter(l => !assignedIds.has(l.id)).slice(0, visibleAvail).map(lead => (
          <div key={lead.id}
            onClick={() => toggleSelect(lead.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              background: selected.has(lead.id) ? 'rgba(255,122,61,0.08)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              border: selected.has(lead.id) ? '2px solid #FF7A3D' : '2px solid #333',
              background: selected.has(lead.id) ? '#FF7A3D' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {selected.has(lead.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span style={{ color: scoreColor(lead.score), fontFamily: 'monospace', fontWeight: 600, minWidth: 24, fontSize: 12 }}>{lead.score}</span>
            <span className="text-ink-1" style={{ fontSize: 12, flex: 1 }}>{lead.address}</span>
            <span className="font-mono text-ink-3" style={{ fontSize: 10 }}>{lead.permit_type}</span>
          </div>
        ))}
        {available.filter(l => !assignedIds.has(l.id)).length === 0 && (
          <div className="text-[12px] text-ink-3 py-3 text-center">No matching leads found</div>
        )}
        {available.filter(l => !assignedIds.has(l.id)).length > visibleAvail && (
          <div className="text-center py-3">
            <button onClick={() => setVisibleAvail(v => v + 30)}
              style={{ padding: '6px 16px', borderRadius: 8, fontSize: 10, fontWeight: 600, border: '1px solid rgba(255,122,61,0.2)', cursor: 'pointer', background: 'rgba(255,122,61,0.06)', color: '#FF7A3D' }}>
              Load 30 more
            </button>
          </div>
        )}
      </div>

      {/* Assign button */}
      {selected.size > 0 && (
        <div className="mt-3">
          <button onClick={handleAssign} disabled={busy}
            className="btn-ember"
            style={{ padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 600, opacity: busy ? 0.5 : 1 }}>
            Assign {selected.size} lead{selected.size > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}