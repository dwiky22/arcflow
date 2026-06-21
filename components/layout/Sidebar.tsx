'use client'

import { useState } from 'react'

type Page = 'dashboard' | 'bridge' | 'swap' | 'send' | 'batch' | 'ai'

interface SidebarProps {
  activePage: string
  onNavigate: (page: Page) => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
}

const navItems = [
  {
    id: 'dashboard' as Page, label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )
  },
  {
    id: 'bridge' as Page, label: 'Bridge',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    )
  },
  {
    id: 'swap' as Page, label: 'Swap',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
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
    id: 'batch' as Page, label: 'Batch Send',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    id: 'ai' as Page, label: 'AI Agent',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    )
  },
]

export default function Sidebar({ activePage, onNavigate, darkMode = true, onToggleDarkMode }: SidebarProps) {
  const [hovered, setHovered] = useState<Page | null>(null)

  const bg = darkMode ? '#080b14' : '#ffffff'
  const borderColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'
  const iconColor = darkMode ? '#94A3B8' : '#64748B'
  const activeIconColor = '#0EA5E9'
  const tooltipBg = darkMode ? '#0c0f1a' : '#1e293b'

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100vh', width: 56,
      background: bg, borderRight: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0', gap: 4, zIndex: 50,
      transition: 'background 0.3s'
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(14,165,233,0.3)', cursor: 'pointer'
        }} onClick={() => onNavigate('dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z"
              fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 28, height: 1, background: borderColor, marginBottom: 8 }} />

      {/* Nav Items */}
      {navItems.map(item => {
        const isActive = activePage === item.id
        const isHovered = hovered === item.id

        return (
          <div key={item.id} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate(item.id)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: isActive
                  ? 'rgba(14,165,233,0.15)'
                  : isHovered
                  ? darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                  : 'transparent',
                color: isActive ? activeIconColor : iconColor,
                outline: isActive ? '1px solid rgba(14,165,233,0.3)' : 'none',
                boxShadow: isActive ? '0 0 12px rgba(14,165,233,0.15)' : 'none',
              }}>
              {item.icon}
            </button>

            {/* Active indicator */}
            {isActive && (
              <div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 20, borderRadius: '0 2px 2px 0',
                background: '#0EA5E9',
                boxShadow: '0 0 8px rgba(14,165,233,0.5)'
              }} />
            )}

            {/* Tooltip */}
            {isHovered && (
              <div style={{
                position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)',
                zIndex: 100, pointerEvents: 'none',
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  background: tooltipBg, border: `1px solid ${borderColor}`,
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 11, fontWeight: 600, color: '#F1F5F9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {item.label}
                  {/* Tooltip arrow */}
                  <div style={{
                    position: 'absolute', left: -4, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8, height: 8,
                    background: tooltipBg,
                    border: `1px solid ${borderColor}`,
                    borderRight: 'none', borderTop: 'none',
                    transform: 'translateY(-50%) rotate(45deg)'
                  }} />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 28, height: 1, background: borderColor, marginBottom: 8 }} />

      {/* Dark Mode Toggle */}
      <button
        onClick={onToggleDarkMode}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          border: `1px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, transition: 'all 0.2s',
          marginBottom: 4
        }}>
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Settings icon */}
      <button
        title="Settings"
        onClick={() => window.open('https://github.com/dwiky22/arcflow', '_blank')}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: iconColor, transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </aside>
  )
}