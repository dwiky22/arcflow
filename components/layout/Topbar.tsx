'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect, usePublicClient } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'
import { TOKEN_LOGOS } from '@/lib/tokens'

export default function Topbar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const [showMenu, setShowMenu] = useState(false)
  const [usdcBal, setUsdcBal] = useState('0.00')
  const [eurcBal, setEurcBal] = useState('0.00')
  const [blockNum, setBlockNum] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Fetch balances
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

  // Fetch block number
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
      {/* Left — Logo + Network */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(14,165,233,0.3)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9', letterSpacing: '-0.3px' }}>ArcFlow</span>
        </div>

        {/* Network badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)',
          fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 4px #22C55E' }} />
          ⚡ Arc v0.7.2 · 5042002
        </div>

        {/* Block number */}
        {blockNum && (
          <div style={{
            fontSize: 10, fontFamily: 'monospace', color: '#475569',
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            Block <span style={{ color: '#22C55E' }}>#{parseInt(blockNum).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Gas badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
          <span>⛽</span>
          <span>Gas: <span style={{ color: '#0EA5E9', fontFamily: 'monospace' }}>$0.01</span></span>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

        {/* Wallet */}
        {isConnected && address ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 12px 6px 6px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
              color: '#F1F5F9', transition: 'all 0.15s'
            }}>
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff'
              }}>
                {address.slice(2, 4).toUpperCase()}
              </div>

              {/* Balances */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden' }}>
                    {TOKEN_LOGOS.USDC}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9' }}>{usdcBal}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', overflow: 'hidden' }}>
                    {TOKEN_LOGOS.EURC}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#818CF8' }}>{eurcBal}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: 10, color: '#475569' }}>▾</span>
            </button>

            {/* Dropdown */}
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                <div style={{
                  position: 'absolute', top: '110%', right: 0, minWidth: 240, zIndex: 100,
                  background: '#0a0d18', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '1px' }}>
                      CONNECTED WALLET
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#F1F5F9', marginBottom: 4 }}>
                      {address.slice(0, 12)}...{address.slice(-10)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#22C55E' }}>ARC Testnet v0.7.2</span>
                    </div>
                  </div>

                  {/* Balances */}
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '1px' }}>BALANCES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { token: 'USDC', bal: usdcBal, color: '#0EA5E9', prefix: '$' },
                        { token: 'EURC', bal: eurcBal, color: '#818CF8', prefix: '€' },
                      ].map(b => (
                        <div key={b.token} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden' }}>
                              {TOKEN_LOGOS[b.token]}
                            </div>
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>{b.token}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: b.color, fontFamily: 'monospace' }}>
                            {b.prefix}{b.bal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: 8 }}>
                    <button onClick={copyAddress}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#94A3B8', fontSize: 13, textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {copied ? '✅' : '📋'} {copied ? 'Copied!' : 'Copy Address'}
                    </button>

                    <button onClick={() => { window.open(`https://testnet.arcscan.app/address/${address}`, '_blank'); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#94A3B8', fontSize: 13, textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      🔍 View on ArcScan
                    </button>

                    <button onClick={() => { window.open('https://faucet.circle.com', '_blank'); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#94A3B8', fontSize: 13, textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      🚰 Get Test Tokens
                    </button>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                    <button onClick={() => { disconnect(); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#EF4444', fontSize: 13, textAlign: 'left'
                      }}
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