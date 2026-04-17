import './globals.css'

export const metadata = {
  title: 'BuilderLeads | Palisades Fire Intel',
  description: 'Permit intelligence for Palisades fire rebuild',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}

function Sidebar() {
  return (
    <aside className="w-[240px] bg-navy-900 border-r border-navy-600 flex flex-col p-0 sticky top-0 h-screen">
      <div className="p-5 flex items-center gap-3 border-b border-navy-600">
        <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0b10" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-tight">BuilderLeads</div>
          <div className="text-xs text-accent font-medium">Palisades Fire Intel</div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        <NavLink href="/" icon={<GridIcon />} label="Command Center" />
        <NavLink href="/leads" icon={<ListIcon />} label="All Leads" />
        <NavLink href="/map" icon={<MapIcon />} label="Map View" />
        <NavLink href="/outreach" icon={<MailIcon />} label="Outreach Queue" />
      </nav>

      <div className="p-4 border-t border-navy-600">
        <div className="text-xs text-slate-650">Data refreshed daily</div>
        <div className="text-xs text-slate-500">Pipeline active</div>
      </div>
    </aside>
  )
}

function NavLink({ href, icon, label }) {
  return (
    <a href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-accent hover:bg-navy-700 transition-all">
      {icon}
      <span>{label}</span>
    </a>
  )
}

function GridIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> }
function ListIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function MapIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> }
function MailIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
