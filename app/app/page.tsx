'use client'

import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import ActivityFeed from '@/components/ui/ActivityFeed'
import BridgePanel from '@/components/features/BridgePanel'
import SwapPanel from '@/components/features/SwapPanel'
import SendPanel from '@/components/features/SendPanel'
import AIPanel from '@/components/features/AIPanel'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'

type Page = 'dashboard' | 'bridge' | 'swap' | 'send' | 'ai'

const TABS = [
  { id: 'bridge' as Page, label: '🌉 Bridge', color: '#0EA5E9' },
  { id: 'swap' as Page, label: '🔄 Swap', color: '#818CF8' },
  { id: 'send' as Page, label: '📤 Send', color: '#22C55E' },
  { id: 'ai' as Page, label: '⚡ AI Agent', color: '#6366F1' },
]

function StatCard({ label, value, sub, subColor = '#22C55E', icon, accent = '#0EA5E9' }: any) {
  return (
    <div style={{
      background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accent}12`, border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{icon}</div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor, fontFamily: 'monospace' }}>{sub}</div>}
    </div>
  )
}

function QuickAction({ icon, label, desc, color, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '16px', cursor: 'pointer', width: '100%',
      display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
      textAlign: 'left'
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}40`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#475569' }}>{desc}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: '#475569', fontSize: 16 }}>→</div>
    </button>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [activeTab, setActiveTab] = useState<Page>('bridge')
  const [transactions, setTransactions] = useState<any[]>([])

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10000 },
  })
  const { data: eurcBalance } = useReadContract({
    address: CONTRACTS.EURC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10000 },
  })

  const formattedUSDC = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'
  const formattedEURC = eurcBalance ? parseFloat(formatUnits(eurcBalance as bigint, 6)).toFixed(2) : '0.00'
  const totalUSD = (parseFloat(formattedUSDC) + parseFloat(formattedEURC) * 1.08).toFixed(2)

  const handleSuccess = (tx: any) => {
    setTransactions(prev => [{
      id: Date.now().toString(), type: tx.type,
      description: tx.type === 'bridge' ? `Bridge ${tx.amount} ${tx.token} → ${tx.toChain}`
        : tx.type === 'swap' ? `Swap ${tx.amount} ${tx.fromToken} → ${tx.toToken}`
        : `Send ${tx.amount} ${tx.token}`,
      amount: `${tx.type === 'send' ? '-' : '+'}${tx.amount}`,
      time: 'just now', status: 'success', hash: tx.hash,
    }, ...prev].slice(0, 10))
  }

  const handleAIAction = (action: any) => {
    if (action.type === 'bridge') { setActiveTab('bridge'); setActivePage('bridge') }
    if (action.type === 'swap') { setActiveTab('swap'); setActivePage('swap') }
    if (action.type === 'send') { setActiveTab('send'); setActivePage('send') }
  }

  const handleNavigate = (page: Page) => {
    setActivePage(page)
    if (page !== 'dashboard') setActiveTab(page)
  }

  const renderPanel = () => {
    switch (activeTab) {
      case 'bridge': return <BridgePanel onSuccess={handleSuccess} />
      case 'swap': return <SwapPanel onSuccess={handleSuccess} />
      case 'send': return <SendPanel onSuccess={handleSuccess} />
      case 'ai': return <AIPanel onAction={handleAIAction} />
      default: return <BridgePanel onSuccess={handleSuccess} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06080f', overflowX: 'hidden' }}>
      {/* Grid BG */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(14,165,233,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.02) 1px,transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      {/* Glow top */}
      <div style={{
        position: 'fixed', top: -100, left: '30%', width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <Topbar />

      <main style={{ marginLeft: 56, paddingTop: 56, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '28px 24px', maxWidth: 1280, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#0EA5E9', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                Arc Network Testnet
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.5px', margin: 0 }}>
                {activePage === 'dashboard' ? 'Dashboard'
                  : activePage === 'bridge' ? 'Bridge'
                  : activePage === 'swap' ? 'Swap'
                  : activePage === 'send' ? 'Send'
                  : 'AI Agent'}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 8, background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.15)', fontSize: 11,
                fontFamily: 'monospace', color: '#22C55E'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                Live · 5042002
              </div>
              <div style={{
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)',
                fontSize: 11, fontFamily: 'monospace', color: '#64748B'
              }}>
                {isConnected ? `${address?.slice(0,6)}...${address?.slice(-4)}` : 'Not connected'}
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard
              label="Total Portfolio"
              value={`$${totalUSD}`}
              sub={isConnected ? '↑ across ARC Testnet' : 'Connect wallet'}
              accent="#0EA5E9"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatCard
              label="USDC Balance"
              value={`$${formattedUSDC}`}
              sub={isConnected ? '↑ on ARC Testnet' : 'Connect wallet'}
              accent="#0EA5E9"
              icon={<span style={{ fontSize: 12, fontWeight: 800, color: '#0EA5E9' }}>$</span>}
            />
            <StatCard
              label="EURC Balance"
              value={`€${formattedEURC}`}
              sub={isConnected ? '↑ on ARC Testnet' : 'Connect wallet'}
              subColor="#818CF8" accent="#818CF8"
              icon={<span style={{ fontSize: 12, fontWeight: 800, color: '#818CF8' }}>€</span>}
            />
            <StatCard
              label="Transactions"
              value={transactions.length.toString()}
              sub={`${transactions.length} this session`}
              subColor="#22C55E" accent="#22C55E"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            />
          </div>

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

            {/* Left: Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

              {/* Quick Actions — only on dashboard */}
              {activePage === 'dashboard' && (
                <div style={{ background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
                    Quick Actions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <QuickAction icon="🌉" label="Bridge" desc="Cross-chain via Circle CCTP" color="#0EA5E9" onClick={() => { setActiveTab('bridge'); setActivePage('bridge') }} />
                    <QuickAction icon="🔄" label="Swap" desc="USDC ↔ EURC via AMM" color="#818CF8" onClick={() => { setActiveTab('swap'); setActivePage('swap') }} />
                    <QuickAction icon="📤" label="Send" desc="Transfer to any address" color="#22C55E" onClick={() => { setActiveTab('send'); setActivePage('send') }} />
                    <QuickAction icon="⚡" label="AI Agent" desc="Natural language commands" color="#6366F1" onClick={() => { setActiveTab('ai'); setActivePage('ai') }} />
                  </div>
                </div>
              )}

              {/* Main Panel */}
              <div style={{ background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                {/* Panel Header */}
                <div style={{ padding: '18px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: 2, background: '#060810', borderRadius: 12, padding: 4, marginBottom: 0 }}>
                    {TABS.map(tab => (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActivePage(tab.id) }}
                        style={{
                          flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: activeTab === tab.id ? '#0a0d18' : 'transparent',
                          color: activeTab === tab.id ? tab.color : '#475569',
                          boxShadow: activeTab === tab.id ? '0 1px 8px rgba(0,0,0,0.5)' : 'none',
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                          borderTop: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                        }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel Content */}
                <div style={{ padding: 24 }}>
                  {renderPanel()}
                </div>
              </div>

              {/* Network Info */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
              }}>
                {[
                  { label: 'Chain ID', value: '5042002', color: '#0EA5E9' },
                  { label: 'Block Time', value: '~0.48s', color: '#22C55E' },
                  { label: 'Gas Token', value: 'USDC', color: '#818CF8' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#0a0d18', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12, padding: '14px 16px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

              {/* Wallet Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid rgba(14,165,233,0.15)', borderRadius: 16, padding: 20
              }}>
                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>Wallet</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18
                  }}>👤</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9', fontFamily: 'monospace' }}>
                      {isConnected ? `${address?.slice(0,8)}...${address?.slice(-6)}` : 'Not Connected'}
                    </div>
                    <div style={{ fontSize: 10, color: isConnected ? '#22C55E' : '#EF4444', marginTop: 2 }}>
                      {isConnected ? '● Connected · ARC Testnet' : '● Disconnected'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { symbol: 'USDC', bal: formattedUSDC, color: '#0EA5E9', prefix: '$' },
                    { symbol: 'EURC', bal: formattedEURC, color: '#818CF8', prefix: '€' },
                  ].map(a => (
                    <div key={a.symbol} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: `${a.color}15`, border: `1px solid ${a.color}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: a.color
                        }}>{a.prefix}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{a.symbol}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: a.color, fontFamily: 'monospace' }}>
                        {a.prefix}{a.bal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <ActivityFeed transactions={transactions} />

              {/* Powered By */}
              <div style={{
                borderRadius: 14, padding: 16,
                background: 'linear-gradient(135deg,rgba(14,165,233,0.04),rgba(129,140,248,0.04))',
                border: '1px solid rgba(14,165,233,0.1)'
              }}>
                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 10 }}>POWERED BY</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Circle CCTP', color: '#0EA5E9' },
                    { label: 'ARC Network', color: '#22C55E' },
                    { label: 'Groq AI', color: '#6366F1' },
                    { label: 'RainbowKit', color: '#818CF8' },
                  ].map(t => (
                    <span key={t.label} style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 6,
                      fontFamily: 'monospace', background: `${t.color}10`,
                      color: t.color, border: `1px solid ${t.color}20`
                    }}>{t.label}</span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}