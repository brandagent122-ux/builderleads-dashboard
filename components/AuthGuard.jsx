'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, getProfile } from '@/lib/supabase'
import { getTradeConfig } from '@/lib/tradeConfig'
import SidebarNav from '@/components/SidebarNav'
import MarketSelector from '@/components/MarketSelector'

export default function AuthGuard({ children }) {
  const [status, setStatus] = useState('loading')
  const [activeMarket, setActiveMarket] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [trade, setTrade] = useState('gc')
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const checkedRef = useRef(false)
  const stageRef = useRef(null)

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

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
        if (p && p.trade) {
          setTrade(p.trade)
        }
      }

      checkedRef.current = true
      setStatus('ready')
    }
    check()
  }, [pathname])

  useEffect(() => {
    if (!stageRef.current) return
    const config = getTradeConfig(trade)
    const el = stageRef.current
    el.style.setProperty('--trade-color', config.color)
    el.style.setProperty('--trade-color-rgb', config.colorRgb)
    el.style.setProperty('--trade-wash', 'rgba(' + config.colorRgb + ', 0.08)')
    el.style.setProperty('--ember', config.color)
    el.style.setProperty('--ember-rgb', config.colorRgb)
    el.style.setProperty('--ember-wash', 'rgba(' + config.colorRgb + ', 0.08)')
    el.style.setProperty('--ember-hi', config.color)
    window.dispatchEvent(new CustomEvent('trade-loaded', { detail: trade }))
  }, [trade, status])

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
    return <div style={{ minHeight: '100vh', background: 'var(--page, #141416)' }} />
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

  const tradeConfig = getTradeConfig(trade)

  const sidebarContent = (
    <>
      <a href="/" className="flex items-center gap-3 px-2 mb-3">
        <div className="icon-chip" style={{ background: tradeConfig.color }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141416" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-0 tracking-tight">BuilderLeads</div>
        </div>
      </a>

      <div className="px-2 mb-3">
        <div style={{
          background: 'rgba(' + tradeConfig.colorRgb + ', 0.08)',
          border: '1px solid rgba(' + tradeConfig.colorRgb + ', 0.2)',
          borderRadius: 10,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>{tradeConfig.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: tradeConfig.color }}>{tradeConfig.name}</div>
            <div style={{ fontSize: 9, color: '#666' }}>13 markets active</div>
          </div>
        </div>
      </div>

      {activeMarket && (
        <div className="px-2 mb-2">
          <MarketSelector activeMarket={activeMarket} onSelect={handleMarketChange} />
        </div>
      )}
      <SidebarNav trade={trade} tradeConfig={tradeConfig} />
      <div className="mt-4 px-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tradeConfig.color }} />
        <div>
          <div className="font-mono text-[10px] text-ink-3">Data refreshed daily</div>
          <div className="font-mono text-[10px] text-ink-3">Pipeline active</div>
        </div>
      </div>
    </>
  )

  return (
    <div className="stage flex" ref={stageRef}>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop w-[232px] flex flex-col p-3 flex-shrink-0">
        <div className="card-raised p-4 flex flex-col flex-1" style={{ borderRadius: 'var(--r-pill)' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <div className="sidebar-mobile-panel" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2 mb-1">
              <button onClick={() => setMobileOpen(false)} style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#888',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="topbar px-4 md:px-6 pt-4 md:pt-5 pb-3 flex items-center justify-between gap-3">
          {/* Hamburger (mobile only) */}
          <button className="hamburger-btn" onClick={() => setMobileOpen(true)} style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)]">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tradeConfig.color }} />
              <span className="font-mono text-[10px] text-ink-2">LIVE DATA</span>
            </div>
            <div className="w-9 h-9 rounded-xl border border-[var(--line)] flex items-center justify-center cursor-pointer hover:border-ember/30 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          </div>
        </div>
        <main className="flex-1 px-4 md:px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
