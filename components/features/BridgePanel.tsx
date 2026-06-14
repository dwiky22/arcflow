'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'

const BRIDGE_CHAINS = [
  { value: 'Ethereum_Sepolia', label: 'Ethereum Sepolia', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', chainIdHex: '0xaa36a7', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Base_Sepolia', label: 'Base Sepolia', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', chainIdHex: '0x14a34', rpc: 'https://base-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Arbitrum_Sepolia', label: 'Arbitrum Sepolia', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', chainIdHex: '0x66eee', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', symbol: 'ETH' },
  { value: 'Avalanche_Fuji', label: 'Avalanche Fuji', usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65', chainIdHex: '0xa869', rpc: 'https://api.avax-test.network/ext/bc/C/rpc', symbol: 'AVAX' },
  { value: 'Optimism_Sepolia', label: 'Optimism Sepolia', usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D9', chainIdHex: '0xaa37dc', rpc: 'https://sepolia.optimism.io', symbol: 'ETH' },
] as const

const USDC_ABI = ["function balanceOf(address) view returns (uint256)"]

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: 11, color: '#64748B', fontFamily: 'monospace',
  letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'block'
}

export default function BridgePanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const [fromChain, setFromChain] = useState<typeof BRIDGE_CHAINS[number]>(BRIDGE_CHAINS[1])
  const [amount, setAmount] = useState('')
  const [srcBalance, setSrcBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  async function switchToChain(cfg: typeof BRIDGE_CHAINS[number]) {
    const eth = (window as any).ethereum
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainIdHex }] })
    } catch (e: any) {
      if (e.code === 4902 || e.code === -32603) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: cfg.chainIdHex, chainName: cfg.label, rpcUrls: [cfg.rpc], nativeCurrency: { name: cfg.symbol, symbol: cfg.symbol, decimals: 18 } }]
        })
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainIdHex }] })
      } else throw e
    }
    await new Promise(r => setTimeout(r, 600))
  }

  async function fetchSrcBalance(cfg: typeof BRIDGE_CHAINS[number]) {
    if (!address) return
    try {
      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const usdc = new ethers.Contract(cfg.usdcAddress, USDC_ABI, provider)
      const bal = await usdc.balanceOf(address)
      setSrcBalance(parseFloat(ethers.formatUnits(bal, 6)).toFixed(2))
    } catch { setSrcBalance('') }
  }

  useEffect(() => {
    fetchSrcBalance(fromChain)
  }, [fromChain, address])

  const handleBridge = async () => {
    if (!isConnected || !address) { setError('Connect wallet first'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }

    setError(''); setLoading(true); setTxHash(''); setStatus('')

    try {
      const eth = (window as any).ethereum

      setStatus(`Switching to ${fromChain.label}...`)
      await switchToChain(fromChain)

      setStatus('Creating adapter...')
      const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6')
      const adapter = await createEthersAdapterFromProvider({ provider: eth })

      const { BridgeKit } = await import('@circle-fin/bridge-kit')
      const kit = new BridgeKit()

      kit.on('*' as any, (payload: any) => {
        const action = payload?.method || payload?.action || ''
        if (action) setStatus(`${action}...`)
      })

      setStatus('Bridging... (confirm approve + burn in wallet)')
      const result = await kit.bridge({
        from: { adapter, chain: fromChain.value },
        to: { chain: 'Arc_Testnet', recipientAddress: address, useForwarder: true },
        amount,
      })

      const hash = (result as any)?.steps?.find((s: any) => s.name === 'mint' && s.txHash)?.txHash
        || (result as any)?.steps?.find((s: any) => s.txHash)?.txHash
        || ''

      setTxHash(hash)
      setStatus('')
      setAmount('')
      setSrcBalance('')
      onSuccess?.({ type: 'bridge', amount, token: 'USDC', fromChain: fromChain.label, toChain: 'ARC Testnet', hash })
    } catch (e: any) {
      if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
        setStatus('')
        setError('Transaction rejected in wallet')
      } else {
        setError(e.message?.slice(0, 150) || 'Bridge failed')
        setStatus('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* From Chain */}
      <div>
        <label style={labelStyle}>From Chain (Source)</label>
        <select value={fromChain.value}
          onChange={e => setFromChain(BRIDGE_CHAINS.find(c => c.value === e.target.value)!)}
          style={{ ...inputStyle, cursor: 'pointer' }}>
          {BRIDGE_CHAINS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {srcBalance && (
          <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontFamily: 'monospace' }}>
            Balance: {srcBalance} USDC
          </p>
        )}
      </div>

      {/* To Chain - fixed */}
      <div>
        <label style={labelStyle}>To Chain (Destination)</label>
        <div style={{ ...inputStyle, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          ARC Testnet (5042002)
        </div>
      </div>

      {/* Amount */}
      <div>
        <label style={labelStyle}>Amount</label>
        <div style={{ position: 'relative' }}>
          <input type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, paddingRight: 80 }} />
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            background: 'rgba(14,165,233,0.1)', color: '#0EA5E9',
            padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(14,165,233,0.2)'
          }}>USDC</span>
        </div>
      </div>

      {/* Info */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12, background: '#111628',
        border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontFamily: 'monospace'
      }}>
        <span style={{ color: '#64748B' }}>Via Circle CCTP · Forwarder auto-mint</span>
        <span style={{ color: '#22C55E' }}>~2-5 min</span>
      </div>

      {/* Warning */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
        fontSize: 11, color: '#F59E0B', fontFamily: 'monospace'
      }}>
        ⚠ Wallet will switch network to {fromChain.label}. Don't close tab during bridging.
      </div>

      {status && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)',
          color: '#0EA5E9', fontSize: 12, fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9',
            display: 'inline-block', animation: 'spin 1s linear infinite'
          }} />
          {status}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {txHash && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Bridge initiated!{' '}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ color: '#22C55E', textDecoration: 'underline' }}>
            View on ArcScan ↗
          </a>
        </div>
      )}

      <button onClick={handleBridge} disabled={loading || !amount || switching}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount ? '#111628' : '#0EA5E9',
          color: loading || !amount ? '#64748B' : '#000',
          boxShadow: !loading && amount ? '0 0 24px rgba(14,165,233,0.3)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Bridging...'}` : `Bridge ${amount || '0'} USDC → ARC`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}