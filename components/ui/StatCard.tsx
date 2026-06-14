'use client'

import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  subColor?: string
  icon?: React.ReactNode
}

export default function StatCard({ label, value, sub, subColor = '#22C55E', icon }: StatCardProps) {
  return (
    <div className="rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/20"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
        {icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-xl font-display font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1 font-mono" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  )
}