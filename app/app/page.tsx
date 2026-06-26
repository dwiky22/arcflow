'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import ActivityFeed from '@/components/ui/ActivityFeed'
import BridgePanel from '@/components/features/BridgePanel'
import SwapPanel from '@/components/features/SwapPanel'
import SendPanel from '@/components/features/SendPanel'
import BatchSendPanel from '@/components/features/BatchSendPanel'
import AIPanel from '@/components/features/AIPanel'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'

type Page = 'dashboard' | 'bridge' | 'swap' | 'send' | 'batch' | 'ai'

const TABS = [
  { id: 'bridge' as Page, label: '🌉 Bridge', color: '#0EA5E9' },
  { id: 'swap' as Page, label: '🔄 Swap', color: '#818CF8' },
  { id: 'send' as Page, label: '📤 Send', color: '#22C55E' },
  { id: 'batch' as Page, label: '⚡ Batch', color: '#6366F1' },
  { id: 'ai' as Page, label: '🤖 AI', color: '#8B5CF6' },
]

const HOW_IT_WORKS: Record<string, { title: string; steps: string[] }> = {
  bridge: {
    title: 'How Bridge Works',
    steps: [
      '1. Select source chain (Ethereum, Base, Arbitrum, etc.)',
      '2. Enter USDC amount to bridge',
      '3. Wallet switches to source chain automatically',
      '4. Approve USDC → burn on source chain',
      '5. Circle CCTP mints USDC natively on ARC (~2-5 min)',
    ]
  },
  swap: {
    title: 'How Swap Works',
    steps: [
      '1. Select token to swap from (USDC/EURC)',
      '2. Enter amount — see live estimate',
      '3. Check price impact vs pool size',
      '4. Approve token once (1-click after)',
      '5. SimpleAMM executes x·y=k swap on-chain',
    ]
  },
  send: {
    title: 'How Send Works',
    steps: [
      '1. Select token (USDC, EURC, USDT, etc.)',
      '2. Enter recipient 0x address or pick from address book',
      '3. Add optional memo (payment reference)',
      '4. Sign 1 transaction — done in ~0.48s',
      '5. Track in Activity Feed → Sent tab',
    ]
  },
  batch: {
    title: 'How Batch Send Works',
    steps: [
      '1. Select token to send',
      '2. Add multiple recipients with different amounts',
      '3. Add optional note per recipient',
      '4. Sign transactions sequentially (3s delay between each)',
      '5. Track all in Activity Feed',
    ]
  },
  ai: {
    title: 'How AI Agent Works',
    steps: [
      '1. Type natural language command',
      '2. AI parses intent → generates action',
      '3. Review action card (type, amount, recipient)',
      '4. Click "Confirm & Execute" to sign on-chain',
      'Try: "Swap 5 USDC to EURC" or "Send 2 USDC to 0x..."',
    ]
  },
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0a0d18', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 100,
          pointerEvents: 'none'
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(255,255,255,0.1)'
          }} />
        </div>
      )}
    </div>
  )
}

function HowItWorksPanel({ tab }: { tab: string }) {
  const [open, setOpen] = useState(false)
  const info = HOW_IT_WORKS[tab]
  if (!info) return null

  return (
    <div style={{ marginBottom: 0 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        background: open ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${open ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.07)'}`,
        color: open ? '#0EA5E9' : '#64748B', fontSize: 11, fontFamily: 'monospace',
        transition: 'all 0.2s'
      }}>
        <span>💡</span>
        <span>{open ? 'Hide' : 'How it works'}</span>
        <span style={{ fontSize: 9 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: '14px 16px', borderRadius: 12,
          background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.15)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0EA5E9', marginBottom: 10, fontFamily: 'monospace' }}>
            {info.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {info.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
                <span style={{ color: '#0EA5E9', flexShrink: 0 }}>→</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, subColor = '#22C55E', icon, accent = '#0EA5E9' }: any) {
  return (
    <div style={{
      background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
        {icon && (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.5px', marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor, fontFamily: 'monospace' }}>{sub}</div>}
    </div>
  )
}

function QuickAction({ icon, label, desc, color, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: '14px 16px', cursor: 'pointer', width: '100%',
      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s', textAlign: 'left'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = `${color}06` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#0a0d18' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
      </div>
      <div style={{ color: '#475569', fontSize: 14, flexShrink: 0 }}>→</div>
    </button>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [activeTab, setActiveTab] = useState<Page>('bridge')
  const [darkMode, setDarkMode] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [transactions, setTransactions] = useState<any[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]') } catch { return [] }
  })

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8000 },
  })
  const { data: eurcBalance } = useReadContract({
    address: CONTRACTS.EURC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  const formattedUSDC = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'
  const formattedEURC = eurcBalance ? parseFloat(formatUnits(eurcBalance as bigint, 6)).toFixed(2) : '0.00'
  const totalUSD = (parseFloat(formattedUSDC) + parseFloat(formattedEURC) * 1.08).toFixed(2)

  const handleSuccess = (tx: any) => {
    const newTx = {
      id: Date.now().toString(), type: tx.type,
      description: tx.type === 'bridge' ? `Bridge ${tx.amount} USDC → ${tx.toChain}`
        : tx.type === 'swap' ? `Swap ${tx.amount} ${tx.fromToken} → ${tx.toToken}`
        : `Send ${tx.amount} ${tx.token}${tx.memo ? ` · "${tx.memo}"` : ''}`,
      amount: `${tx.type === 'send' ? '-' : '+'}${tx.amount}`,
      time: new Date().toLocaleTimeString(), status: 'success', hash: tx.hash,
    }
    setTransactions(prev => {
      const updated = [newTx, ...prev].slice(0, 20)
      try { localStorage.setItem('arcflow_tx_history', JSON.stringify(updated)) } catch {}
      return updated
    })
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
      case 'batch': return <BatchSendPanel onSuccess={handleSuccess} />
      case 'ai': return <AIPanel onAction={handleAIAction} />
      default: return <BridgePanel onSuccess={handleSuccess} />
    }
  }

  const bg = darkMode ? '#06080f' : '#f1f5f9'
  const cardBg = darkMode ? '#0a0d18' : '#ffffff'
  const textColor = darkMode ? '#F1F5F9' : '#0f172a'
  const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ minHeight: '100vh', background: bg, overflowX: 'hidden', transition: 'background 0.3s' }}>
      {darkMode && <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(14,165,233,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.02) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'fixed', top: -100, left: '30%', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      </>}

      <Sidebar activePage={activePage} onNavigate={handleNavigate} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(d => !d)} />
      <Topbar />

      <main style={{ marginLeft: isMobile ? 0 : 56, paddingTop: 56, minHeight: '100vh', position: 'relative', zIndex: 1, paddingBottom: isMobile ? 72 : 0 }}>
        <div style={{ padding: isMobile ? '20px 16px' : '28px 24px', maxWidth: 1280, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#0EA5E9', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
                Arc Network Testnet · v0.7.2
              </div>
              <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: textColor, letterSpacing: '-0.5px', margin: 0 }}>
                {activePage === 'dashboard' ? 'Dashboard' : activePage === 'bridge' ? 'Bridge' : activePage === 'swap' ? 'Swap' : activePage === 'send' ? 'Send' : activePage === 'batch' ? 'Batch Send' : 'AI Agent'}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11, fontFamily: 'monospace', color: '#22C55E' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 4px #22C55E' }} />
                {isMobile ? '5042002' : 'Live · 5042002'}
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid-4col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard label="Portfolio" value={`$${totalUSD}`} sub={isConnected ? '↑ ARC Testnet' : 'Connect wallet'} accent="#0EA5E9"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
            <StatCard label="USDC" value={`$${formattedUSDC}`} sub={isConnected ? '↑ on ARC' : '—'} accent="#0EA5E9"
              icon={<span style={{ fontSize: 11, fontWeight: 800, color: '#0EA5E9' }}>$</span>} />
            <StatCard label="EURC" value={`€${formattedEURC}`} sub={isConnected ? '↑ on ARC' : '—'} subColor="#818CF8" accent="#818CF8"
              icon={<span style={{ fontSize: 11, fontWeight: 800, color: '#818CF8' }}>€</span>} />
            <StatCard label="Transactions" value={transactions.length.toString()} sub={`${transactions.length} saved`} subColor="#22C55E" accent="#22C55E"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
          </div>

          {/* Main Grid */}
          <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 20 }}>

            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

              {/* Quick Actions Dashboard */}
              {activePage === 'dashboard' && (
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Quick Actions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                    <QuickAction icon="🌉" label="Bridge" desc="Cross-chain via Circle CCTP" color="#0EA5E9" onClick={() => { setActiveTab('bridge'); setActivePage('bridge') }} />
                    <QuickAction icon="🔄" label="Swap" desc="USDC ↔ EURC via SimpleAMM" color="#818CF8" onClick={() => { setActiveTab('swap'); setActivePage('swap') }} />
                    <QuickAction icon="📤" label="Send" desc="Transfer any token + memo" color="#22C55E" onClick={() => { setActiveTab('send'); setActivePage('send') }} />
                    <QuickAction icon="⚡" label="Batch Send" desc="Multi-wallet in one session" color="#6366F1" onClick={() => { setActiveTab('batch'); setActivePage('batch') }} />
                    <QuickAction icon="🤖" label="AI Agent" desc="Natural language commands" color="#8B5CF6" onClick={() => { setActiveTab('ai'); setActivePage('ai') }} />
                  </div>
                </div>
              )}

              {/* Main Panel */}
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, overflow: 'hidden' }}>
                {/* Tabs */}
                <div style={{ padding: '14px 16px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', gap: 2, background: darkMode ? '#060810' : '#f1f5f9', borderRadius: 10, padding: 3, overflowX: 'auto' }}>
                    {TABS.map(tab => (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActivePage(tab.id) }}
                        style={{
                          flex: '1 0 auto', padding: isMobile ? '8px 6px' : '8px 4px', borderRadius: 8,
                          fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: activeTab === tab.id ? cardBg : 'transparent',
                          color: activeTab === tab.id ? tab.color : '#475569',
                          boxShadow: activeTab === tab.id ? '0 1px 8px rgba(0,0,0,0.3)' : 'none',
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                          borderTop: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                        }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel content */}
                <div style={{ padding: isMobile ? 16 : 24 }}>
                  {/* How it works tooltip */}
                  <div style={{ marginBottom: 16 }}>
                    <HowItWorksPanel tab={activeTab} />
                  </div>
                  {renderPanel()}
                </div>
              </div>

              {/* Network Info */}
              <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { label: 'Chain ID', value: '5042002', color: '#0EA5E9' },
                  { label: 'Block Time', value: '~0.48s', color: '#22C55E' },
                  { label: 'Gas Token', value: 'USDC', color: '#818CF8' },
                ].map(item => (
                  <div key={item.label} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column — hidden on mobile or shown below */}
            {(!isMobile) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

                {/* Wallet Card */}
                <div style={{
                  background: darkMode ? 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))' : 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(99,102,241,0.05))',
                  border: '1px solid rgba(14,165,233,0.15)', borderRadius: 16, padding: 18
                }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Wallet</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {isConnected && address ? address.slice(2, 4).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: textColor, fontFamily: 'monospace' }}>
                        {isConnected ? `${address?.slice(0, 8)}...${address?.slice(-6)}` : 'Not Connected'}
                      </div>
                      <div style={{ fontSize: 10, color: isConnected ? '#22C55E' : '#EF4444', marginTop: 2 }}>
                        {isConnected ? '● Connected · ARC v0.7.2' : '● Disconnected'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { symbol: 'USDC', bal: formattedUSDC, color: '#0EA5E9', prefix: '$' },
                      { symbol: 'EURC', bal: formattedEURC, color: '#818CF8', prefix: '€' },
                    ].map(a => (
                      <div key={a.symbol} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '9px 12px', borderRadius: 10,
                        background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${borderColor}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${a.color}15`, border: `1px solid ${a.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: a.color }}>{a.prefix}</div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{a.symbol}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: a.color, fontFamily: 'monospace' }}>{a.prefix}{a.bal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <ActivityFeed transactions={transactions} />

                {transactions.length > 0 && (
                  <button onClick={() => { setTransactions([]); localStorage.removeItem('arcflow_tx_history') }}
                    style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#EF4444', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                    🗑 Clear history
                  </button>
                )}

                {/* Powered By */}
                <div style={{ borderRadius: 14, padding: 14, background: darkMode ? 'linear-gradient(135deg,rgba(14,165,233,0.04),rgba(129,140,248,0.04))' : 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.1)' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 8 }}>POWERED BY</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Circle CCTP', color: '#0EA5E9' },
                      { label: 'ARC v0.7.2', color: '#22C55E' },
                      { label: 'Groq AI', color: '#6366F1' },
                      { label: 'RainbowKit', color: '#818CF8' },
                    ].map(t => (
                      <span key={t.label} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', background: `${t.color}10`, color: t.color, border: `1px solid ${t.color}20` }}>{t.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: Activity Feed di bawah */}
          {isMobile && (
            <div style={{ marginTop: 20 }}>
              <ActivityFeed transactions={transactions} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}