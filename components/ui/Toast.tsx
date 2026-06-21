'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  desc?: string
  link?: string
}

interface ToastContextType {
  show: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 6000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const config = {
    success: { icon: '✓', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
    error: { icon: '✕', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
    info: { icon: 'i', color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.25)' },
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed', top: 70, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340
      }}>
        {toasts.map(t => {
          const c = config[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: '#0a0d18', border: `1px solid ${c.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'arcflowSlideIn 0.3s ease'
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: c.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: c.color, fontSize: 13, fontWeight: 700
              }}>{c.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{t.title}</div>
                {t.desc && <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{t.desc}</div>}
                {t.link && (
                  <a href={t.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: c.color, fontFamily: 'monospace', textDecoration: 'underline', display: 'inline-block', marginTop: 2 }}>
                    View on ArcScan ↗
                  </a>
                )}
              </div>
              <button onClick={() => remove(t.id)} style={{
                background: 'transparent', border: 'none', color: '#475569',
                cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1
              }}>×</button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes arcflowSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}