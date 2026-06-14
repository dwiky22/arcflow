'use client'

import { useState } from 'react'

type Page = 'dashboard' | 'bridge' | 'swap' | 'send' | 'ai'

interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

const navItems = [
  {
    id: 'dashboard' as Page, label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    id: 'bridge' as Page, label: 'Bridge',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h16M4 12c0-2.5 2-4 4-4h8c2 0 4 1.5 4 4"/><path d="M8 12v4"/><path d="M16 12v4"/>
        <path d="M2 16h20"/>
      </svg>
    )
  },
  {
    id: 'swap' as Page, label: 'Swap',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    )
  },
  {
    id: 'send' as Page, label: 'Send',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    )
  },
  {
    id: 'ai' as Page, label: 'AI Agent',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/>
        <rect x="3" y="8" width="18" height="13" rx="2"/>
        <circle cx="9" cy="14" r="1" fill="currentColor"/>
        <circle cx="15" cy="14" r="1" fill="currentColor"/>
      </svg>
    )
  },
]

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [hovered, setHovered] = useState<Page | null>(null)

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100vh', width: 56,
      background: '#080b14', borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0', gap: 4, zIndex: 50
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(14,165,233,0.35)',
          cursor: 'pointer'
        }}>
          {/* ArcFlow SVG Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Glow */}
        <div style={{
          position: 'absolute', inset: -4, borderRadius: 14,
          background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Divider */}
      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map((item) => (
          <div key={item.id} style={{ position: 'relative' }}>
            <button
              onClick={() => onNavigate(item.id)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 38, height: 38, borderRadius: 10,
                border: activePage === item.id ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: activePage === item.id ? 'rgba(14,165,233,0.1)' : 'transparent',
                color: activePage === item.id ? '#0EA5E9' : '#475569',
                transition: 'all 0.15s',
                boxShadow: activePage === item.id ? '0 0 12px rgba(14,165,233,0.15)' : 'none'
              }}
            >
              {item.icon}
            </button>
            {hovered === item.id && (
              <div style={{
                position: 'absolute', left: 46, top: '50%', transform: 'translateY(-50%)',
                padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 100,
                background: '#0c0f1a', border: '1px solid rgba(255,255,255,0.08)',
                color: '#F1F5F9', fontSize: 12, fontWeight: 500,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
              }}>
                {item.label}
                <div style={{
                  position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)',
                  width: 8, height: 8, background: '#0c0f1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRight: 'none', borderTop: 'none',
                  transform: 'translateY(-50%) rotate(45deg)'
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
      <button
        style={{
          width: 38, height: 38, borderRadius: 10, border: '1px solid transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: '#475569', transition: 'all 0.15s'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    </aside>
  )
}