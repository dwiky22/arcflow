'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

interface TxItem {
  id: string
  type: string
  description: string
  amount: string
  time: string
  status: string
  hash?: string
  memo?: string | null
}

interface IncomingItem {
  token: string
  amount: string
  memo: string | null
  timestamp: number
  hash?: string
}

export default function ActivityFeed({ transactions }: { transactions: TxItem[] }) {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')
  const [incoming, setIncoming] = useState<IncomingItem[]>([])

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem('arcflow_incoming')
        if (saved) setIncoming(JSON.parse(saved))
      } catch {}
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [address])

  const typeIcon = (type: string) => {
    if (type === 'bridge') return '🌉'
    if (type === 'swap') return '🔄'
    if (type === 'batch') return '⚡'
    return '📤'
  }

  const typeColor = (type: string) => {
    if (type === 'bridge') return '#0EA5E9'
    if (type === 'swap') return '#818CF8'
    if (type === 'batch') return '#6366F1'
    return '#22C55E'
  }

  return (
    <div style={{
      background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: 16, flex: 1
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
          Activity
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: '#060810', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setActiveTab('sent')} style={{
            flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: activeTab === 'sent' ? '#0a0d18' : 'transparent',
            color: activeTab === 'sent' ? '#F1F5F9' : '#475569',
            boxShadow: activeTab === 'sent' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>📤 Sent ({transactions.length})</button>
          <button onClick={() => setActiveTab('received')} style={{
            flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: activeTab === 'received' ? '#0a0d18' : 'transparent',
            color: activeTab === 'received' ? '#22C55E' : '#475569',
            boxShadow: activeTab === 'received' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
          }}>💰 Received ({incoming.length})</button>
        </div>
      </div>

      {/* Sent Tab */}
      {activeTab === 'sent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
              No transactions yet
            </div>
          ) : (
            transactions.slice(0, 10).map(tx => (
              <div key={tx.id} style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${typeColor(tx.type)}12`,
                      border: `1px solid ${typeColor(tx.type)}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                    }}>{typeIcon(tx.type)}</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#F1F5F9', fontWeight: 500, marginBottom: 2 }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{tx.time}</div>
                      {tx.hash && (
                        <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 9, color: '#0EA5E9', textDecoration: 'underline', fontFamily: 'monospace' }}>
                          {tx.hash.slice(0, 10)}... ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: tx.amount.startsWith('-') ? '#EF4444' : '#22C55E',
                      fontFamily: 'monospace'
                    }}>
                      {tx.amount}
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  </div>
                </div>

                {/* Memo bubble for sent tx */}
                {tx.memo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 8, marginTop: 8,
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <span style={{ fontSize: 11 }}>📝</span>
                    <div>
                      <div style={{ fontSize: 9, color: '#6366F1', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: 1 }}>MEMO</div>
                      <div style={{ fontSize: 11, color: '#F1F5F9' }}>{tx.memo}</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Received Tab */}
      {activeTab === 'received' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {incoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>📭</div>
              <div style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                No incoming transfers yet
              </div>
              <div style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>
                Auto-detected every 10 seconds
              </div>
            </div>
          ) : (
            incoming.map((item, i) => (
              <div key={i} style={{
                padding: '12px', borderRadius: 10,
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.12)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: item.memo ? 8 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💰</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', fontFamily: 'monospace' }}>
                        +{item.amount} {item.token}
                      </span>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                      {item.hash && (
                        <a href={`https://testnet.arcscan.app/tx/${item.hash}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 9, color: '#0EA5E9', textDecoration: 'underline', fontFamily: 'monospace', display: 'block', marginTop: 2 }}>
                          {item.hash.slice(0, 10)}... ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontFamily: 'monospace'
                  }}>received</span>
                </div>

                {/* Memo */}
                {item.memo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)',
                    marginTop: 8
                  }}>
                    <span style={{ fontSize: 12 }}>📌</span>
                    <div>
                      <div style={{ fontSize: 9, color: '#0EA5E9', fontFamily: 'monospace', letterSpacing: '0.5px', marginBottom: 2 }}>
                        MEMO
                      </div>
                      <div style={{ fontSize: 12, color: '#F1F5F9' }}>"{item.memo}"</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {incoming.length > 0 && (
            <button onClick={() => {
              localStorage.removeItem('arcflow_incoming')
              setIncoming([])
            }} style={{
              padding: '6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.15)',
              background: 'transparent', color: '#EF4444', fontSize: 10,
              cursor: 'pointer', fontFamily: 'monospace', marginTop: 4
            }}>
              🗑 Clear received history
            </button>
          )}
        </div>
      )}
    </div>
  )
}