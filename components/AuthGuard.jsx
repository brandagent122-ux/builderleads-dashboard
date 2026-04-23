'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, getProfile } from '@/lib/supabase'
import SidebarNav from '@/components/SidebarNav'

export default function AuthGuard({ children }) {
  const [status, setStatus] = useState('loading')
  const [profile, setProfile] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setStatus('no-auth')
        return
      }

      const p = await getProfile(session.user.id)
      setProfile(p)

      if (p && !p.tos_accepted_at && pathname !== '/tos') {
        setStatus('needs-tos')
        return
      }

      setStatus('ready')
    }
    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        window.location.href = '/'
      }
      if (event === 'SIGNED_OUT') {
        setStatus('no-auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname])

  // Login and TOS pages render without shell
  if (pathname === '/login') return children
  if (pathname === '/tos') return children

  // Loading
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page, #141416)' }}>
        <div className="font-mono text-[12px] text-ink-3">Loading...</div>
      </div>
    )
  }

  // Not logged in
  if (status === 'no-auth') {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  // Needs TOS
  if (status === 'needs-tos') {
    if (typeof window !== 'undefined') window.location.href = '/tos'
    return null
  }

  // Authenticated - show full layout
  return (
    <div className="stage flex">
      <aside className="w-[232px] flex flex-col p-3 flex-shrink-0">
        <div className="card-raised p-4 flex flex-col flex-1" style={{ borderRadius: 'var(--r-pill)' }}>
          <a href="/" className="flex items-center gap-3 px-2 mb-6">
            <div className="icon-chip icon-chip-ember">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-0 tracking-tight">BuilderLeads</div>
              <div className="font-mono text-[10px] text-ember tracking-wide">PALISADES FIRE INTEL</div>
            </div>
          </a>
          <SidebarNav />
          <div className="mt-4 px-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-moss animate-pulse" />
            <div>
              <div className="font-mono text-[10px] text-ink-3">Data refreshed daily</div>
              <div className="font-mono text-[10px] text-ink-3">Pipeline active</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="px-6 pt-5 pb-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)]">
            <div className="w-2 h-2 rounded-full bg-moss animate-pulse" />
            <span className="font-mono text-[10px] text-ink-2">LIVE DATA</span>
          </div>
          <div className="w-9 h-9 rounded-xl border border-[var(--line)] flex items-center justify-center cursor-pointer hover:border-ember/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
        </div>
        <main className="flex-1 px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}