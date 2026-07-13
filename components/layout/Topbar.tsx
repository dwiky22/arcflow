'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect, usePublicClient, useChainId, useSwitchChain } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'
import { TokenLogo } from '@/lib/tokens'

export default function Topbar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [showMenu, setShowMenu] = useState(false)
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const [usdcBal, setUsdcBal] = useState('0.00')
  const [eurcBal, setEurcBal] = useState('0.00')
  const [blockNum, setBlockNum] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const isMainnet = chainId === 5042
  const networkColor = isMainnet ? '#22C55E' : '#0EA5E9'
  const explorerUrl = isMainnet
    ? 'https://arc-mainnet.cloud.blockscout.com'
    : 'https://testnet.arcscan.app'

  useEffect(() => {
    if (!publicClient || !address) return
    const fetch = async () => {
      try {
        const [u, e] = await Promise.all([
          publicClient.readContract({ address: CONTRACTS.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
          publicClient.readContract({ address: CONTRACTS.EURC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
        ])
        setUsdcBal(parseFloat(formatUnits(u, 6)).toFixed(2))
        setEurcBal(parseFloat(formatUnits(e, 6)).toFixed(2))
      } catch {}
    }
    fetch()
    const interval = setInterval(fetch, 8000)
    return () => clearInterval(interval)
  }, [address, publicClient])

  useEffect(() => {
    if (!publicClient) return
    const fetch = async () => {
      try {
        const block = await publicClient.getBlockNumber()
        setBlockNum(block.toString())
      } catch {}
    }
    fetch()
    const interval = setInterval(fetch, 2000)
    return () => clearInterval(interval)
  }, [publicClient])

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 56, right: 0, height: 56, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      background: 'rgba(6,8,15,0.95)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(14,165,233,0.3)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z"
                fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9', letterSpacing: '-0.3px' }}>ArcFlow</span>
        </div>

        {/* Network Switcher */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNetworkMenu(!showNetworkMenu)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
            background: isMainnet ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.08)',
            border: `1px solid ${isMainnet ? 'rgba(34,197,94,0.3)' : 'rgba(14,165,233,0.2)'}`,
            fontSize: 11, fontFamily: 'monospace', color: networkColor
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: networkColor, display: 'inline-block', boxShadow: `0 0 4px ${networkColor}` }} />
            {isMainnet ? '⚡ ARC Mainnet' : '⚡ Arc Testnet v0.7.2'}
            <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
          </button>

          {showNetworkMenu && (
            <>
              <div onClick={() => setShowNetworkMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position: 'absolute', top: '110%', left: 0, minWidth: 230, zIndex: 100,
                background: '#0a0d18', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}>
                <div style={{ padding: '10px 14px', fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  SELECT NETWORK
                </div>
                {[
                  { id: 5042002, name: 'ARC Testnet', desc: 'Chain 5042002 · Free USDC faucet', color: '#0EA5E9', tag: 'TESTNET' },
                  { id: 5042, name: 'ARC Mainnet', desc: 'Chain 5042 · Early access 🆕', color: '#22C55E', tag: 'MAINNET' },
                ].map(n => (
                  <button key={n.id} onClick={() => {
                    switchChain?.({ chainId: n.id })
                    setShowNetworkMenu(false)
                  }} style={{
                    width: '100%', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: chainId === n.id ? `${n.color}08` : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = chainId === n.id ? `${n.color}08` : 'transparent'}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{n.name}</div>
                      <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>{n.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      {chainId === n.id && <span style={{ fontSize: 12, color: n.color }}>✓</span>}
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${n.color}15`, color: n.color, fontFamily: 'monospace', fontWeight: 700 }}>{n.tag}</span>
                    </div>
                  </button>
                ))}

                {isMainnet && (
                  <div style={{ padding: '10px 14px', fontSize: 10, color: '#F59E0B', fontFamily: 'monospace', background: 'rgba(245,158,11,0.05)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    ⚠ Mainnet uses real USDC — be careful!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Block number */}
        {blockNum && (
          <div style={{
            fontSize: 10, fontFamily: 'monospace', color: '#475569',
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            Block <span style={{ color: networkColor }}>#{parseInt(blockNum).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⛽</span>
          <span>Gas: <span style={{ color: networkColor, fontFamily: 'monospace' }}>$0.01 USDC</span></span>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

        {isConnected && address ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 12px 6px 6px', borderRadius: 12, cursor: 'pointer',
              background: `${networkColor}10`,
              border: `1px solid ${networkColor}30`,
              color: '#F1F5F9', transition: 'all 0.15s'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${networkColor}, #6366F1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff'
              }}>
                {address.slice(2, 4).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden' }}>
                    <TokenLogo symbol="USDC" size={12} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9' }}>{usdcBal}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden' }}>
                    <TokenLogo symbol="EURC" size={12} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#818CF8' }}>{eurcBal}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: networkColor, display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: 10, color: '#475569' }}>▾</span>
            </button>

            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                <div style={{
                  position: 'absolute', top: '110%', right: 0, minWidth: 250, zIndex: 100,
                  background: '#0a0d18', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 6, letterSpacing: '1px' }}>CONNECTED WALLET</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#F1F5F9', marginBottom: 4 }}>
                      {address.slice(0, 12)}...{address.slice(-10)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: networkColor, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: networkColor }}>
                        {isMainnet ? 'ARC Mainnet' : 'ARC Testnet v0.7.2'}
                      </span>
                    </div>
                  </div>

                  {/* Balances */}
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '1px' }}>BALANCES</div>
                    {[
                      { token: 'USDC', bal: usdcBal, color: '#0EA5E9', prefix: '$' },
                      { token: 'EURC', bal: eurcBal, color: '#818CF8', prefix: '€' },
                    ].map(b => (
                      <div key={b.token} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden' }}>
                            <TokenLogo symbol={b.token} size={18} />
                          </div>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{b.token}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: b.color, fontFamily: 'monospace' }}>
                          {b.prefix}{b.bal}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: 8 }}>
                    {[
                      { icon: copied ? '✅' : '📋', label: copied ? 'Copied!' : 'Copy Address', action: copyAddress, color: '#94A3B8' },
                      { icon: '🔍', label: 'View on Explorer', action: () => { window.open(`${explorerUrl}/address/${address}`, '_blank'); setShowMenu(false) }, color: '#94A3B8' },
                      { icon: '🚰', label: 'Get Test Tokens', action: () => { window.open('https://faucet.circle.com', '_blank'); setShowMenu(false) }, color: '#94A3B8', hide: isMainnet },
                    ].filter(a => !a.hide).map(a => (
                      <button key={a.label} onClick={a.action}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: a.color, fontSize: 13, textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {a.icon} {a.label}
                      </button>
                    ))}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                    <button onClick={() => { disconnect(); setShowMenu(false) }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: '#EF4444', fontSize: 13, textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      🔌 Disconnect Wallet
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <ConnectButton chainStatus="none" showBalance={false} />
        )}
      </div>
    </header>
  )
}