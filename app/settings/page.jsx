'use client'
export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
      <p className="text-sm text-slate-500 mt-1">Manage your account and preferences</p>

      <div className="card p-6 mt-6">
        <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-650 mb-1">Plan</div>
            <div className="text-sm text-white font-medium">Admin</div>
          </div>
          <div>
            <div className="text-xs text-slate-650 mb-1">Market</div>
            <div className="text-sm text-white font-medium">Palisades Fire Zone</div>
          </div>
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
        <div className="flex items-center justify-between py-3 border-b border-navy-600">
          <div>
            <div className="text-sm text-white">Tracerfy (skip trace)</div>
            <div className="text-xs text-slate-500">Contact enrichment for owner name, phone, email</div>
          </div>
          <div className="text-xs text-amber-400 bg-amber-500/15 px-3 py-1 rounded-md font-medium">Not connected</div>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-navy-600">
          <div>
            <div className="text-sm text-white">Stripe (payments)</div>
            <div className="text-xs text-slate-500">Credit purchases and subscription billing</div>
          </div>
          <div className="text-xs text-amber-400 bg-amber-500/15 px-3 py-1 rounded-md font-medium">Not connected</div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm text-white">Supabase (database)</div>
            <div className="text-xs text-slate-500">Lead storage and pipeline data</div>
          </div>
          <div className="text-xs text-green-400 bg-green-500/15 px-3 py-1 rounded-md font-medium">Connected</div>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <h3 className="text-sm font-semibold text-white mb-4">Pipeline agents</h3>
        <div className="flex flex-col gap-2">
          <AgentRow name="Scout" desc="Pulls permits from LADBS" status="active" />
          <AgentRow name="Filter" desc="Matches against fire perimeter" status="active" />
          <AgentRow name="Enricher" desc="Property data from County Assessor" status="active" />
          <AgentRow name="Scorer" desc="AI scoring 0-100" status="active" />
          <AgentRow name="Drafter" desc="Outreach email generation" status="active" />
          <AgentRow name="DINS" desc="CAL FIRE damage classification" status="active" />
        </div>
      </div>
    </div>
  )
}

function AgentRow({ name, desc, status }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-navy-900">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
        <div>
          <div className="text-sm text-white font-medium">{name}</div>
          <div className="text-xs text-slate-650">{desc}</div>
        </div>
      </div>
      <div className={`text-xs font-medium ${status === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
        {status === 'active' ? 'Active' : 'Inactive'}
      </div>
    </div>
  )
}
