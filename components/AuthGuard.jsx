'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, getProfile } from '@/lib/supabase'
import SidebarNav from '@/components/SidebarNav'
import MarketSelector from '@/components/MarketSelector'

export default function AuthGuard({ children }) {
  const [status, setStatus] = useState('loading')
  const [activeMarket, setActiveMarket] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()
  const checkedRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('builderleads_market')
    setActiveMarket(saved || 'palisades')
  }, [])

  function handleMarketChange(slug) {
    setActiveMarket(slug)
    localStorage.setItem('builderleads_market', slug)
    window.dispatchEvent(new CustomEvent('market-changed', { detail: slug }))
  }

  useEffect(() => {
    if (checkedRef.current && status === 'ready') return

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setStatus('no-auth')
        return
      }

      if (!checkedRef.current) {
        const p = await getProfile(session.user.id)
        if (p && p.role === 'paused') {
          await supabase.auth.signOut()
          setStatus('revoked')
          return
        }
        if (p && !p.tos_accepted_at && pathname !== '/tos') {
          setStatus('needs-tos')
          return
        }
        if (p && p.role === 'admin') {
          setIsAdmin(true)
        }
      }

      checkedRef.current = true
      setStatus('ready')
    }
    check()
  }, [pathname])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        checkedRef.current = false
        setStatus('no-auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (pathname === '/login' || pathname === '/tos' || pathname === '/privacy' || pathname === '/terms' || pathname.endsWith('/print')) return children

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page, #141416)' }} />
    )
  }

  if (status === 'no-auth') {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return <div style={{ minHeight: '100vh', background: 'var(--page, #141416)' }} />
  }

  if (status === 'revoked') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--page, #141416)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center', padding: 40, borderRadius: 24,
          background: 'var(--stage, #1B1B1F)',
          boxShadow: '8px 8px 20px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.02)',
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Access Suspended</div>
          <div style={{ fontSize: 13, color: '#8B8B96', lineHeight: 1.6 }}>
            Your account has been temporarily suspended. Please contact your account administrator for assistance.
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: '#555560' }}>freddy@ru4reelz.com</div>
        </div>
      </div>
    )
  }

  if (status === 'needs-tos') {
    if (typeof window !== 'undefined') window.location.href = '/tos'
    return <div style={{ minHeight: '100vh', background: 'var(--page, #141416)' }} />
  }

  return (
    <div className="stage flex">
      <aside className="w-[232px] flex flex-col p-3 flex-shrink-0">
        <div className="card-raised p-4 flex flex-col flex-1" style={{ borderRadius: 'var(--r-pill)' }}>
          <a href="/" className="flex items-center gap-3 px-2 mb-4">
            <div className="icon-chip icon-chip-ember">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-0 tracking-tight">BuilderLeads</div>
            </div>
          </a>
          {isAdmin && activeMarket && (
            <div className="px-2 mb-2">
              <MarketSelector activeMarket={activeMarket} onSelect={handleMarketChange} />
            </div>
          )}
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