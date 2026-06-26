'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { ERC20_ABI } from '@/lib/contracts'

export const ARC_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
    decimals: 6,
    color: '#2775CA',
    bg: 'rgba(39,117,202,0.15)',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    decimals: 6,
    color: '#0052CC',
    bg: 'rgba(0,82,204,0.15)',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c/logo.png',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x6175a8471C2122f778445e7E07A164250a19E661',
    decimals: 6,
    color: '#26A17B',
    bg: 'rgba(38,161,123,0.15)',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  },
  {
    symbol: 'cirBTC',
    name: 'Circle Wrapped Bitcoin',
    address: '0xf8C4e6dC6F0Bde92d7bc6De4a0CD37CC61D4f26',
    decimals: 8,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.15)',
    logo: '',
  },
  {
    symbol: 'ETH',
    name: 'Ether (Seed)',
    address: '0xcA3495B0C8C7088Be5c3caf0f060a42c1aE1f7C8',
    decimals: 18,
    color: '#627EEA',
    bg: 'rgba(98,126,234,0.15)',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
]

export const BRIDGE_CHAIN_CONFIGS: Record<string, { color: string; bg: string; logo: string; name: string; short: string }> = {
  Ethereum_Sepolia: {
    color: '#627EEA', bg: 'rgba(98,126,234,0.15)',
    name: 'Ethereum Sepolia', short: 'Sepolia',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
  Base_Sepolia: {
    color: '#0052FF', bg: 'rgba(0,82,255,0.15)',
    name: 'Base Sepolia', short: 'Base',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
  Arbitrum_Sepolia: {
    color: '#28A0F0', bg: 'rgba(40,160,240,0.15)',
    name: 'Arbitrum Sepolia', short: 'Arbitrum',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  },
  Avalanche_Fuji: {
    color: '#E84142', bg: 'rgba(232,65,66,0.15)',
    name: 'Avalanche Fuji', short: 'Fuji',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  },
  Optimism_Sepolia: {
    color: '#FF0420', bg: 'rgba(255,4,32,0.15)',
    name: 'Optimism Sepolia', short: 'Optimism',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  },
  Arc_Testnet: {
    color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)',
    name: 'Arc Testnet', short: 'ARC',
    logo: '',
  },
}

// Arc Logo
function ArcLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="arcG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9"/><stop offset="1" stopColor="#6366F1"/>
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#arcG)"/>
      <path d="M20 8L10 14.5v6c0 5.5 4 10.5 10 12.5 6-2 10-7 10-12.5v-6L20 8z"
        fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M15 20l4 4 7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// cirBTC Logo
function CirBTCLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="cirG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED"/><stop offset="1" stopColor="#5B21B6"/>
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#cirG)"/>
      <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="bold" fill="white" fontFamily="Arial">₿</text>
    </svg>
  )
}

// Token Logo
export function TokenLogo({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const token = ARC_TOKENS.find(t => t.symbol === symbol)
  const color = token?.color || '#475569'
  const bg = token?.bg || 'rgba(71,85,105,0.15)'
  const logo = token?.logo || ''

  if (symbol === 'cirBTC') return <CirBTCLogo size={size} />

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, position: 'relative'
    }}>
      {logo && !imgError ? (
        <img src={logo} alt={symbol}
          style={{ width: '72%', height: '72%', objectFit: 'contain' }}
          onError={() => setImgError(true)} />
      ) : (
        <span style={{ fontSize: size * 0.36, fontWeight: 800, color, fontFamily: 'monospace' }}>
          {symbol[0]}
        </span>
      )}
    </div>
  )
}

// Chain Logo
export function ChainLogo({ chain, size = 28 }: { chain: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const config = BRIDGE_CHAIN_CONFIGS[chain]
  const color = config?.color || '#475569'
  const bg = config?.bg || 'rgba(71,85,105,0.15)'
  const logo = config?.logo || ''

  if (chain === 'Arc_Testnet') return <ArcLogo size={size} />

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0
    }}>
      {logo && !imgError ? (
        <img src={logo} alt={chain}
          style={{ width: '72%', height: '72%', objectFit: 'contain' }}
          onError={() => setImgError(true)} />
      ) : (
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color, fontFamily: 'monospace' }}>
          {config?.short?.slice(0, 3) || '?'}
        </span>
      )}
    </div>
  )
}

// Token Selector Modal WITH REAL BALANCE
export function TokenSelectorModal({
  onSelect, onClose, exclude,
}: {
  onSelect: (token: typeof ARC_TOKENS[0]) => void
  onClose: () => void
  exclude?: string
}) {
  const [search, setSearch] = useState('')
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [loadingBal, setLoadingBal] = useState(true)

  // Fetch all balances at once
  useEffect(() => {
    if (!address || !publicClient) { setLoadingBal(false); return }

    const fetchAll = async () => {
      setLoadingBal(true)
      const result: Record<string, string> = {}
      await Promise.allSettled(
        ARC_TOKENS.map(async (t) => {
          try {
            const bal = await publicClient.readContract({
              address: t.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            }) as bigint
            const formatted = parseFloat(formatUnits(bal, t.decimals))
            result[t.symbol] = formatted > 0
              ? formatted < 0.0001 ? '<0.0001' : formatted.toFixed(t.decimals === 8 ? 6 : 4)
              : '0'
          } catch {
            result[t.symbol] = '—'
          }
        })
      )
      setBalances(result)
      setLoadingBal(false)
    }

    fetchAll()
  }, [address, publicClient])

  const filtered = ARC_TOKENS.filter(t =>
    t.symbol !== exclude &&
    (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()))
  )

  // Sort: tokens with balance first
  const sorted = [...filtered].sort((a, b) => {
    const balA = parseFloat(balances[a.symbol] || '0')
    const balB = parseFloat(balances[b.symbol] || '0')
    return balB - balA
  })

  const hasBalance = (symbol: string) => {
    const bal = parseFloat(balances[symbol] || '0')
    return bal > 0
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)'
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 420, maxHeight: '75vh',
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>Select a token</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: 'none',
            color: '#94A3B8', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '10px 14px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search name or symbol"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 13, color: '#F1F5F9',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16 }}>×</button>
            )}
          </div>
        </div>

        {/* Quick picks */}
        {!search && (
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              Popular on ARC
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ARC_TOKENS.filter(t => t.symbol !== exclude).slice(0, 4).map(t => (
                <button key={t.symbol} onClick={() => { onSelect(t); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px 6px 6px', borderRadius: 20,
                    background: t.bg, border: `1px solid ${t.color}30`,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                  <TokenLogo symbol={t.symbol} size={18} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{t.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Token list with balance */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingBal && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: 12, fontFamily: 'monospace' }}>
              Loading balances...
            </div>
          )}

          {sorted.map(t => {
            const bal = balances[t.symbol]
            const hasBal = hasBalance(t.symbol)

            return (
              <button key={t.symbol} onClick={() => { onSelect(t); onClose() }}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <TokenLogo symbol={t.symbol} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>{t.symbol}</span>
                    {hasBal && (
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 4,
                        background: `${t.color}15`, color: t.color,
                        border: `1px solid ${t.color}25`, fontFamily: 'monospace'
                      }}>in wallet</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{t.name}</div>
                </div>

                {/* Balance */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {loadingBal ? (
                    <div style={{ width: 40, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s infinite' }} />
                  ) : bal !== undefined ? (
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
                        color: hasBal ? t.color : '#475569'
                      }}>
                        {bal}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
                        {t.symbol}
                      </div>
                    </div>
                  ) : null}
                </div>
              </button>
            )
          })}

          {sorted.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13 }}>No tokens found</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10, color: '#475569', fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          Showing {sorted.length} tokens on ARC Testnet · Balances auto-detected
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  )
}

// backward compat
export const TOKEN_LOGOS: Record<string, any> = {}
export const CHAIN_LOGOS: Record<string, any> = {}