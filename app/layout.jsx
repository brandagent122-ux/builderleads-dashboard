import './globals.css'

export const metadata = {
  title: 'BuilderLeads | Palisades Fire Intel',
  description: 'Permit intelligence for Palisades fire rebuild',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}

function LayoutShell({ children }) {
  return (
    <div className="stage flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <Topbar />
        <main className="flex-1 px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function Sidebar() {
  return <SidebarClient />
}

function SidebarClient() {
  return (
    <aside className="w-[232px] flex flex-col p-3 flex-shrink-0">
      <div className="card-raised p-4 flex flex-col flex-1" style={{ borderRadius: 'var(--r-pill)' }}>
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 px-2 mb-6">
          <div className="icon-chip icon-chip-ember">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-0 tracking-tight">BuilderLeads</div>
            <div className="font-mono text-[10px] text-ember tracking-wide">PALISADES FIRE INTEL</div>
          </div>
        </a>

        {/* Primary nav */}
        <nav className="flex flex-col gap-1 flex-1">
          <NavItem href="/" icon="grid" label="Command Center" />
          <NavItem href="/leads" icon="list" label="All Leads" />
          <NavItem href="/map" icon="map" label="Map View" />
          <NavItem href="/outreach" icon="mail" label="Outreach Queue" />

          <div className="h-px bg-[var(--line)] my-2" />

          <NavItem href="/saved" icon="star" label="Saved Leads" />
          <NavItem href="/reports" icon="file" label="Reports" />
          <NavItem href="/settings" icon="gear" label="Settings" />

          <div className="flex-1" />

          <div className="h-px bg-[var(--line)] my-2" />
          <a href="/api/logout" className="nav-item text-ink-3 hover:text-ruby">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="mt-4 px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-moss animate-pulse" />
          <div>
            <div className="font-mono text-[10px] text-ink-3">Data refreshed daily</div>
            <div className="font-mono text-[10px] text-ink-3">Pipeline active</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label }) {
  const icons = {
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.5"/><circle cx="3.5" cy="12" r="1.5"/><circle cx="3.5" cy="18" r="1.5"/></svg>,
    map: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    mail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    gear: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  }

  return (
    <a href={href} className="nav-item">
      {icons[icon]}
      <span>{label}</span>
    </a>
  )
}

function Topbar() {
  return (
    <div className="px-6 pt-5 pb-3 flex items-center justify-end gap-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)]">
        <div className="w-2 h-2 rounded-full bg-moss animate-pulse" />
        <span className="font-mono text-[10px] text-ink-2">LIVE DATA</span>
      </div>
      <div className="w-9 h-9 rounded-xl border border-[var(--line)] flex items-center justify-center cursor-pointer hover:border-ember/30 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
    </div>
  )
}
