'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { useState } from 'react'

export default function Topbar() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header style={{
      position: 'fixed', top: 0, left: 56, right: 0, height: 56, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      background: 'rgba(6,8,15,0.95)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#F1F5F9', letterSpacing: '-0.3px' }}>
          ArcFlow
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20,
          background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)',
          fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          ARC Testnet · 5042002
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Gas: <span style={{ color: '#0EA5E9', fontFamily: 'monospace' }}>$0.01</span>
        </span>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Block: <span style={{ color: '#0EA5E9', fontFamily: 'monospace' }}>~0.48s</span>
        </span>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

        {isConnected && address ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
              color: '#F1F5F9', transition: 'all 0.15s'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff'
              }}>
                {address.slice(2, 4).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#475569' }}>▾</span>
            </button>

            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                <div style={{
                  position: 'absolute', top: '110%', right: 0, minWidth: 220, zIndex: 100,
                  background: '#0a0d18', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 6, letterSpacing: '1px' }}>
                      CONNECTED WALLET
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#F1F5F9', marginBottom: 4 }}>
                      {address.slice(0, 10)}...{address.slice(-8)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#22C55E' }}>ARC Testnet</span>
                    </div>
                  </div>

                  <div style={{ padding: 8 }}>
                    <button onClick={() => { navigator.clipboard.writeText(address); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#94A3B8', fontSize: 13, textAlign: 'left'
                      }}>
                      📋 Copy Address
                    </button>

                    <button onClick={() => { window.open(`https://testnet.arcscan.app/address/${address}`, '_blank'); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#94A3B8', fontSize: 13, textAlign: 'left'
                      }}>
                      🔍 View on ArcScan
                    </button>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                    <button onClick={() => { disconnect(); setShowMenu(false) }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#EF4444', fontSize: 13, textAlign: 'left'
                      }}>
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