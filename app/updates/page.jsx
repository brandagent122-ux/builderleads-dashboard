'use client'

const UPDATES = [
  {
    version: '1.7.0',
    date: 'May 3, 2026',
    title: 'Learning Loops + Outreach Overhaul',
    items: [
      'Draft outreach learning system: edit tracking, subject line A/B testing, angle performance scoring',
      'Outreach queue: approve, edit, reject drafts with local state (no disappearing)',
      'Subject line picker: choose from 3 AI-generated options per draft',
      'Copy button with "Copied!" feedback animation',
      'Re-draft prevention: won\'t burn API credits if draft already exists for a lead',
      'Server-side drafts API for reliable data reads',
      'Session cache so drafts persist across page navigation',
      '"View in Outreach" button replaces "Draft Outreach" when draft exists',
      'Back to Outreach link on lead detail page',
    ],
  },
  {
    version: '1.6.0',
    date: 'May 3, 2026',
    title: 'Market-Type Awareness + Verification',
    items: [
      'Dynamic KPIs: fire markets show Destroyed/Rebuild Value, general markets show New Construction/Permit Value',
      'Conditional lead list: DAMAGE column for fire markets, PROJECT column for general markets',
      'Project type tags: NEW BUILD, REMODEL, ADDITION, DEMO, POOL (color coded)',
      'Contact verification badges: VERIFIED, MOBILE, DELIVERABLE on phones and emails',
      'Strict verified-only contacts: unverified phones and invalid emails hidden from display',
      'Contact re-fetch button for previously unlocked leads',
      'Map page now shows trade-specific scores (enviro users see enviro scores)',
      'Market filtering works for client users across all pages',
      'DNC FILTER VERIFIED badge on every contact card',
    ],
  },
  {
    version: '1.5.0',
    date: 'May 3, 2026',
    title: 'Environmental Services Vertical',
    items: [
      'Trade-based dashboard: one database field controls entire UI per user',
      'Environmental lead detail: hazmat risk profile, mold assessment, scope flags, job estimates, compliance checklist',
      'Enviro scorer agent: pre-1986 homes scored by year built, fire damage, permit scope',
      'Permit history agent: checks full LADBS history for prior abatement and roofing',
      'Contact verification waterfall: Tracerfy > REISkip > ZeroBounce > Trestle',
      '8 trade configs: GC, Enviro, Roofing, Solar, Plumbing, HVAC, Electrical, Public Adjuster',
    ],
  },
  {
    version: '1.4.0',
    date: 'May 3, 2026',
    title: 'Pipeline + Model Updates',
    items: [
      'Claude model updated to claude-sonnet-4-6 (scorer + enviro scorer)',
      'Drafter running on claude-opus-4-6',
      'Sidebar navigation upgraded to Next.js Link (faster page transitions)',
      'RLS policy added to drafts table for authenticated reads',
    ],
  },
  {
    version: '1.3.0',
    date: 'Apr 29, 2026',
    title: 'Draft Outreach System',
    items: [
      '4-agent pipeline animation: Analyze > Angle > Write > Verify',
      'Magical writing animation with sparkle particle effects',
      '3 subject line options generated per draft',
      'Approve, copy, and send workflow',
      'Draft memory and angle performance tracking tables',
      'Voice profiles table for contractor style learning',
    ],
  },
  {
    version: '1.2.0',
    date: 'Apr 27, 2026',
    title: 'Multi-Market Expansion',
    items: [
      '13 active LA markets: Palisades, West LA, San Pedro, Wilmington, Harbor City, Encino, Sherman Oaks, Studio City, Woodland Hills, Venice, Westchester, South LA, Hollywood',
      'Markets table drives all configuration (no code changes to add markets)',
      'Mini SoCal SVG market map in sidebar with pulsing animations',
      'General construction scoring profile: LLM at 50% weight',
      'Market-aware data queries across all pages',
      'Map address search with auto-zoom and fly animations',
      'Mapbox dark tiles with satellite toggle',
      'Google Street View integration',
    ],
  },
  {
    version: '1.1.0',
    date: 'Apr 24, 2026',
    title: 'Enrichment Pipeline + Security',
    items: [
      '12 pipeline agents running via daily cron',
      'LotSize, Zoning, Inspections, Neighbors, Flood, Dedup, DINS agents',
      'Supabase Auth for multi-user accounts',
      'Admin dashboard for managing clients and tiers',
      'RLS security on all tables',
      'DNC compliance with bulletproof filtering',
      'Tracerfy skip trace integration (pass-through, no data stored)',
    ],
  },
  {
    version: '1.0.0',
    date: 'Apr 19, 2026',
    title: 'Initial Launch',
    items: [
      'BuilderLeads platform launched',
      'Neumorphic dark theme dashboard',
      'Scout, Filter, Enricher, Scorer, Drafter agents',
      'LADBS permit data pipeline',
      'Palisades fire zone filtering with 250ft buffer',
      'AI scoring 0-100 with Claude',
      'Command Center, All Leads, Map View, Outreach Queue',
      'CSV export with checkbox selection',
      'Score rings and lead cards',
    ],
  },
]

export default function UpdatesPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Updates</h1>
        <p className="text-sm text-slate-500 mt-1">Version history and changelog</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />

        <div className="flex flex-col gap-6">
          {UPDATES.map((update, i) => (
            <div key={i} className="flex gap-5">
              {/* Timeline dot */}
              <div style={{ position: 'relative', flexShrink: 0, width: 32, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', position: 'relative', zIndex: 1,
                  background: i === 0 ? 'var(--ember, #FF7A3D)' : 'rgba(255,255,255,0.08)',
                  border: i === 0 ? '2px solid rgba(255,122,61,0.3)' : '2px solid rgba(255,255,255,0.06)',
                  boxShadow: i === 0 ? '0 0 12px rgba(255,122,61,0.3)' : 'none',
                }} />
              </div>

              {/* Content */}
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
                      <span style={{ color: i === 0 ? '#FF7A3D' : '#555', marginTop: 6, flexShrink: 0, width: 4, height: 4, borderRadius: '50%', background: i === 0 ? '#FF7A3D' : '#555' }} />
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
