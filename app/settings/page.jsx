'use client'
import { useState, useEffect } from 'react'
import { getUserContext } from '@/lib/supabase'

export default function SettingsPage() {
  const [ctx, setCtx] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const c = await getUserContext()
      setCtx(c)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8"><div className="skeleton h-40" style={{ borderRadius: 22 }} /></div>

  const profile = ctx?.profile || {}
  const isAdmin = ctx?.isAdmin

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
      <p className="text-sm text-slate-500 mt-1">Manage your account and preferences</p>

      <div className="card p-6 mt-6">
        <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-650 mb-1">Email</div>
            <div className="text-sm text-white font-medium">{ctx?.email || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-650 mb-1">Plan</div>
            <div className="text-sm text-white font-medium capitalize">{isAdmin ? 'Admin' : (profile.tier || 'Starter')}</div>
          </div>
          {profile.company_name && (
            <div>
              <div className="text-xs text-slate-650 mb-1">Company</div>
              <div className="text-sm text-white font-medium">{profile.company_name}</div>
            </div>
          )}
          {profile.trade && (
            <div>
              <div className="text-xs text-slate-650 mb-1">Trade</div>
              <div className="text-sm text-white font-medium">{profile.trade}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-slate-650 mb-1">Market</div>
            <div className="text-sm text-white font-medium">Palisades Fire Zone</div>
          </div>
          {!isAdmin && (
            <div>
              <div className="text-xs text-slate-650 mb-1">Leads available</div>
              <div className="text-sm text-white font-medium">{profile.max_leads || 0}</div>
            </div>
          )}
          {!isAdmin && (
            <div>
              <div className="text-xs text-slate-650 mb-1">Contact unlocks used</div>
              <div className="text-sm text-white font-medium">{profile.contact_unlocks || 0} / {profile.max_unlocks || 0}</div>
            </div>
          )}
          {profile.territory_zips && profile.territory_zips.length > 0 && (
            <div>
              <div className="text-xs text-slate-650 mb-1">Territory</div>
              <div className="text-sm text-white font-medium">{profile.territory_zips.join(', ')}</div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="card p-6 mt-4">
            <h3 className="text-sm font-semibold text-white mb-4">Pipeline</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-650 mb-1">Pipeline status</div>
                <div className="text-sm text-green-400 font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Active (daily at 5:00 AM PT)
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-650 mb-1">Data source</div>
                <div className="text-sm text-white font-medium">LADBS + CAL FIRE DINS</div>
              </div>
            </div>
          </div>

          <div className="card p-6 mt-4">
            <h3 className="text-sm font-semibold text-white mb-4">Integrations</h3>
            <IntegrationRow name="Tracerfy (skip trace)" desc="Contact enrichment for owner name, phone, email" connected={false} />
            <IntegrationRow name="Stripe (payments)" desc="Credit purchases and subscription billing" connected={false} />
            <IntegrationRow name="Supabase (database)" desc="Lead storage and pipeline data" connected={true} />
          </div>

          <div className="card p-6 mt-4">
            <h3 className="text-sm font-semibold text-white mb-4">Pipeline agents</h3>
            <div className="flex flex-col gap-2">
              <AgentRow name="Scout" desc="Pulls permits from LADBS" />
              <AgentRow name="Filter" desc="Matches against fire perimeter" />
              <AgentRow name="Enricher" desc="Property data from County Assessor" />
              <AgentRow name="Scorer" desc="AI scoring 0-100" />
              <AgentRow name="Drafter" desc="Outreach email generation" />
              <AgentRow name="DINS" desc="CAL FIRE damage classification" />
            </div>
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="card p-6 mt-4">
          <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
          <p className="text-sm text-slate-500">Need help or want to upgrade your plan? Contact us at <span className="text-accent">freddy@ru4reelz.com</span></p>
        </div>
      )}
    </div>
  )
}

function IntegrationRow({ name, desc, connected }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-navy-600 last:border-b-0">
      <div>
        <div className="text-sm text-white">{name}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      {connected ? (
        <div className="text-xs text-green-400 bg-green-500/15 px-3 py-1 rounded-md font-medium">Connected</div>
      ) : (
        <div className="text-xs text-amber-400 bg-amber-500/15 px-3 py-1 rounded-md font-medium">Not connected</div>
      )}
    </div>
  )
}

function AgentRow({ name, desc }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-navy-900">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <div>
          <div className="text-sm text-white font-medium">{name}</div>
          <div className="text-xs text-slate-650">{desc}</div>
        </div>
      </div>
      <div className="text-xs font-medium text-green-400">Active</div>
    </div>
  )
}
