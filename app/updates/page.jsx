'use client'

const UPDATES = [
  {
    version: '1.7.0',
    date: 'May 3, 2026',
    title: 'Outreach System Improvements',
    items: [
      'Draft emails now stay visible after approving',
      'Pick from 3 subject line options for each outreach email',
      'Edit drafts before approving',
      '"Copied!" feedback when you copy an email to clipboard',
      'System learns your writing style the more you edit drafts',
      'Won\'t create duplicate drafts for the same lead',
    ],
  },
  {
    version: '1.6.0',
    date: 'May 3, 2026',
    title: 'Smarter Lead Display',
    items: [
      'Dashboard adapts to your market: fire zone leads show damage info, general leads show project type',
      'Project tags on leads list: New Build, Remodel, Addition, Demo, Pool',
      'Contact cards now show verified and mobile badges on phone numbers',
      'Invalid and unverified contact info hidden automatically',
      'One-click re-fetch for previously unlocked contacts',
      'Map view now shows scores specific to your trade',
    ],
  },
  {
    version: '1.5.0',
    date: 'May 3, 2026',
    title: 'Environmental Services Trade',
    items: [
      'Full environmental services dashboard for hazmat contractors',
      'Hazmat risk profiles based on property age and construction era',
      'Mold risk assessment for fire-damaged properties',
      'Job estimates based on square footage and year built',
      'Compliance checklist for asbestos and lead paint regulations',
      'Contact verification across multiple data sources',
    ],
  },
  {
    version: '1.4.0',
    date: 'May 3, 2026',
    title: 'Performance + Navigation',
    items: [
      'Faster page transitions throughout the app',
      'Scoring engine updated to latest version',
      'Improved data reliability on all pages',
    ],
  },
  {
    version: '1.3.0',
    date: 'Apr 29, 2026',
    title: 'Draft Outreach System',
    items: [
      'Generate personalized outreach emails for any lead',
      'Live writing animation as your email drafts',
      'Approve, edit, copy, and send workflow',
      'System tracks which email styles get the best response',
    ],
  },
  {
    version: '1.2.0',
    date: 'Apr 27, 2026',
    title: 'Multi-Market Expansion',
    items: [
      '13 active LA markets from Palisades to Hollywood',
      'Add new markets with zero code changes',
      'Interactive market map in the sidebar',
      'Satellite and dark map toggle',
      'Street View photos on every lead',
      'Address search with auto-zoom on map',
    ],
  },
  {
    version: '1.1.0',
    date: 'Apr 24, 2026',
    title: 'Data Enrichment + Security',
    items: [
      'Property details: lot size, zoning, flood zone, inspection history',
      'Neighbor activity tracking within 500ft',
      'Multi-user accounts with role-based access',
      'Admin dashboard for managing clients',
      'Do-Not-Call compliance filtering on all contacts',
    ],
  },
  {
    version: '1.0.0',
    date: 'Apr 19, 2026',
    title: 'Initial Launch',
    items: [
      'BuilderLeads platform launched',
      'Daily permit data refreshed automatically',
      'Leads scored 0-100 based on project value and intent',
      'Command Center with top leads and key stats',
      'Lead detail pages with full property intel',
      'Map view with score filters',
      'CSV export for selected leads',
    ],
  },
]

export default function UpdatesPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Updates</h1>
        <p className="text-sm text-slate-500 mt-1">What's new in BuilderLeads</p>
      </div>

      <div className="relative">
        <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />

        <div className="flex flex-col gap-6">
          {UPDATES.map((update, i) => (
            <div key={i} className="flex gap-5">
              <div style={{ position: 'relative', flexShrink: 0, width: 32, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', position: 'relative', zIndex: 1,
                  background: i === 0 ? 'var(--ember, #FF7A3D)' : 'rgba(255,255,255,0.08)',
                  border: i === 0 ? '2px solid rgba(255,122,61,0.3)' : '2px solid rgba(255,255,255,0.06)',
                  boxShadow: i === 0 ? '0 0 12px rgba(255,122,61,0.3)' : 'none',
                }} />
              </div>

              <div className="card p-5 flex-1" style={{ borderLeft: i === 0 ? '2px solid var(--ember, #FF7A3D)' : undefined }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{
                    background: i === 0 ? 'rgba(255,122,61,0.1)' : 'rgba(255,255,255,0.04)',
                    color: i === 0 ? '#FF7A3D' : '#888',
                    border: `1px solid ${i === 0 ? 'rgba(255,122,61,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    v{update.version}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{update.date}</span>
                  {i === 0 && <span className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.12)' }}>LATEST</span>}
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-3">{update.title}</h3>
                <div className="flex flex-col gap-1.5">
                  {update.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2.5 text-[13px] text-slate-400">
                      <span style={{ marginTop: 7, flexShrink: 0, width: 4, height: 4, borderRadius: '50%', background: i === 0 ? '#FF7A3D' : '#555' }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="font-mono text-[10px] text-slate-600 tracking-wider">BUILDERLEADS BY RU4REELZ LLC</div>
      </div>
    </div>
  )
}
