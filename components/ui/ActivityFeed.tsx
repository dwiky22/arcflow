'use client'

import { shortenAddress } from '@/lib/utils'

type TxType = 'bridge' | 'swap' | 'send'

interface Transaction {
  id: string
  type: TxType
  description: string
  amount: string
  time: string
  status: 'success' | 'pending' | 'failed'
  hash?: string
}

interface ActivityFeedProps {
  transactions: Transaction[]
}

const txConfig = {
  bridge: {
    icon: '🌉',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.1)',
  },
  swap: {
    icon: '🔄',
    color: '#818CF8',
    bg: 'rgba(129,140,248,0.1)',
  },
  send: {
    icon: '📤',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.1)',
  },
}

const statusConfig = {
  success: { color: '#22C55E', label: '✓' },
  pending: { color: '#F59E0B', label: '⟳' },
  failed: { color: '#EF4444', label: '✗' },
}

export default function ActivityFeed({ transactions }: ActivityFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text)' }}>Recent Activity</div>
        <div className="text-center py-6 text-xs" style={{ color: 'var(--muted)' }}>
          No transactions yet
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text)' }}>Recent Activity</div>
      <div className="flex flex-col gap-1">
        {transactions.map((tx) => {
          const cfg = txConfig[tx.type]
          const sts = statusConfig[tx.status]
          return (
            <div key={tx.id} className="flex items-center gap-3 py-2 rounded-lg px-2 hover:bg-white/5 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Icon */}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: cfg.bg }}>
                {cfg.icon}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                  {tx.description}
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {tx.time}
                </div>
              </div>
              {/* Amount */}
              <div className="text-xs font-mono font-medium" style={{ color: cfg.color }}>
                {tx.amount}
              </div>
              {/* Status */}
              <div className="text-xs font-bold" style={{ color: sts.color }}>
                {sts.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}