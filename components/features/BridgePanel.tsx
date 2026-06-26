'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { useToast } from '@/components/ui/Toast'
import { ChainLogo, TokenLogo } from '@/lib/tokens'

const BRIDGE_CHAINS = [
  { value: 'Ethereum_Sepolia', label: 'Ethereum Sepolia', short: 'Sepolia', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', chainIdHex: '0xaa36a7', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Base_Sepolia', label: 'Base Sepolia', short: 'Base', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', chainIdHex: '0x14a34', rpc: 'https://base-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Arbitrum_Sepolia', label: 'Arbitrum Sepolia', short: 'Arbitrum', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', chainIdHex: '0x66eee', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', symbol: 'ETH' },
  { value: 'Avalanche_Fuji', label: 'Avalanche Fuji', short: 'Fuji', usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65', chainIdHex: '0xa869', rpc: 'https://api.avax-test.network/ext/bc/C/rpc', symbol: 'AVAX' },
  { value: 'Optimism_Sepolia', label: 'Optimism Sepolia', short: 'Optimism', usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D9', chainIdHex: '0xaa37dc', rpc: 'https://sepolia.optimism.io', symbol: 'ETH' },
] as const

const USDC_ABI = ["function balanceOf(address) view returns (uint256)"]

const STEPS = ['Switch network', 'Approve token', 'Burn & bridge', 'Done ✓']

const CHAIN_COLORS: Record<string, string> = {
  Ethereum_Sepolia: '#627EEA',
  Base_Sepolia: '#0052FF',
  Arbitrum_Sepolia: '#28A0F0',
  Avalanche_Fuji: '#E84142',
  Optimism_Sepolia: '#FF0420',
  Arc_Testnet: '#0EA5E9',
}

export default function BridgePanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const toast = useToast()

  const [fromChain, setFromChain] = useState<typeof BRIDGE_CHAINS[number]>(BRIDGE_CHAINS[1])
  const [amount, setAmount] = useState('')
  const [srcBalance, setSrcBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [showChainSelect, setShowChainSelect] = useState(false)

  const fetchBalance = async (cfg: typeof BRIDGE_CHAINS[number]) => {
    if (!address) return
    try {
      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const usdc = new ethers.Contract(cfg.usdcAddress, USDC_ABI, provider)
      const bal = await usdc.balanceOf(address)
      setSrcBalance(parseFloat(ethers.formatUnits(bal, 6)).toFixed(2))
    } catch { setSrcBalance('') }
  }

  useEffect(() => { fetchBalance(fromChain) }, [fromChain, address])

  const switchToChain = async (cfg: typeof BRIDGE_CHAINS[number]) => {
    const eth = (window as any).ethereum
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainIdHex }] })
    } catch (e: any) {
      if (e.code === 4902 || e.code === -32603) {
        await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId: cfg.chainIdHex, chainName: cfg.label, rpcUrls: [cfg.rpc], nativeCurrency: { name: cfg.symbol, symbol: cfg.symbol, decimals: 18 } }] })
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainIdHex }] })
      } else throw e
    }
    await new Promise(r => setTimeout(r, 600))
  }

  const handleBridge = async () => {
    if (!isConnected || !address) { setError('Connect wallet first'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
    setError(''); setLoading(true); setTxHash(''); setCurrentStep(0)

    try {
      const eth = (window as any).ethereum
      setCurrentStep(0)
      toast.show({ type: 'info', title: 'Switching network...', desc: fromChain.label })
      await switchToChain(fromChain)

      setCurrentStep(1)
      const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6')
      const adapter = await createEthersAdapterFromProvider({ provider: eth })
      const { BridgeKit } = await import('@circle-fin/bridge-kit')
      const kit = new BridgeKit()

      setCurrentStep(2)
      toast.show({ type: 'info', title: 'Bridging...', desc: 'Confirm in wallet' })
      const result = await kit.bridge({
        from: { adapter, chain: fromChain.value },
        to: { chain: 'Arc_Testnet', recipientAddress: address, useForwarder: true },
        amount,
      })

      const hash = (result as any)?.steps?.find((s: any) => s.txHash)?.txHash || ''
      setCurrentStep(3)
      setTxHash(hash)
      setAmount('')
      setSrcBalance('')
      onSuccess?.({ type: 'bridge', amount, token: 'USDC', fromChain: fromChain.label, toChain: 'ARC Testnet', hash })
      toast.show({ type: 'success', title: 'Bridge initiated!', desc: `${amount} USDC → ARC`, link: hash ? `https://testnet.arcscan.app/tx/${hash}` : undefined })
    } catch (e: any) {
      setCurrentStep(-1)
      const msg = e?.code === 4001 ? 'Rejected in wallet' : e.message?.slice(0, 100) || 'Bridge failed'
      setError(msg)
      toast.show({ type: 'error', title: 'Bridge failed', desc: msg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  const chainColor = CHAIN_COLORS[fromChain.value] || '#0EA5E9'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* FROM */}
      <div style={{
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '16px', cursor: 'pointer',
      }} onClick={() => setShowChainSelect(!showChainSelect)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: chainColor + '15', border: `1px solid ${chainColor}30`,
            borderRadius: 20, padding: '5px 12px 5px 8px', cursor: 'pointer'
          }}>
            <ChainLogo chain={fromChain.value} size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{fromChain.label}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>{showChainSelect ? '▲' : '▼'}</span>
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: amount ? '#F1F5F9' : '#475569' }}>
          {amount || '0.0'}
        </div>
        {srcBalance && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#475569' }}>~${parseFloat(amount || '0').toFixed(2)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Balance: {srcBalance} USDC</span>
              <button onClick={e => { e.stopPropagation(); setAmount(srcBalance) }}
                style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(14,165,233,0.12)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.2)', cursor: 'pointer', fontFamily: 'monospace' }}>
                HALF
              </button>
              <button onClick={e => { e.stopPropagation(); setAmount(srcBalance) }}
                style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(14,165,233,0.12)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.2)', cursor: 'pointer', fontFamily: 'monospace' }}>
                MAX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chain Dropdown */}
      {showChainSelect && (
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          {BRIDGE_CHAINS.map(c => {
            const isSelected = fromChain.value === c.value
            const color = CHAIN_COLORS[c.value]
            return (
              <button key={c.value} onClick={() => { setFromChain(c); setShowChainSelect(false) }}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSelected ? color + '10' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <ChainLogo chain={c.value} size={28} />
                <span style={{ fontSize: 13, color: isSelected ? color : '#F1F5F9', fontWeight: isSelected ? 600 : 400, flex: 1 }}>
                  {c.label}
                </span>
                {isSelected && <span style={{ color, fontSize: 16 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Swap arrow */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#0d1117', border: '2px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0EA5E9', fontSize: 16, cursor: 'default',
          boxShadow: '0 0 12px rgba(0,0,0,0.4)'
        }}>↕</div>
      </div>

      {/* TO — fixed ARC */}
      <div style={{
        background: '#0d1117', border: '1px solid rgba(14,165,233,0.15)',
        borderRadius: 16, padding: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: 20, padding: '5px 12px 5px 8px'
          }}>
            <ChainLogo chain="Arc_Testnet" size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0EA5E9' }}>Arc Testnet</span>
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: amount ? '#F1F5F9' : '#475569' }}>
          {amount || '0.0'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>~${parseFloat(amount || '0').toFixed(2)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>{address ? `to ${address.slice(0,6)}...${address.slice(-4)}` : ''}</span>
          </div>
        </div>
      </div>

      {/* Amount input (hidden but functional) */}
      <div style={{
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <input
          type="number" placeholder="Enter amount"
          value={amount} onChange={e => setAmount(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            outline: 'none', fontSize: 16, color: '#F1F5F9',
            fontFamily: 'monospace'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <TokenLogo symbol="USDC" size={20} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>USDC</span>
        </div>
      </div>

      {/* Route info */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.06)', fontSize: 11
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontFamily: 'monospace' }}>
          <span>⇄</span>
          <span>via CCTP V2</span>
        </div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.08)', color: '#22C55E', fontFamily: 'monospace', border: '1px solid rgba(34,197,94,0.15)' }}>
          ~2-5 min
        </span>
      </div>

      {/* Warning */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
        fontSize: 11, color: '#F59E0B', fontFamily: 'monospace'
      }}>
        ⚠ Wallet will switch to {fromChain.label}. Don't close tab during bridging.
      </div>

      {/* Progress Stepper */}
      {(loading || currentStep === 3) && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 12 }}>PROGRESS</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: currentStep > i ? '#22C55E' : currentStep === i ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                    border: currentStep > i ? 'none' : currentStep === i ? '2px solid #0EA5E9' : '1px solid rgba(255,255,255,0.08)',
                    color: currentStep > i ? '#06080f' : currentStep === i ? '#0EA5E9' : '#475569',
                  }}>
                    {currentStep > i ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 8, fontFamily: 'monospace', whiteSpace: 'nowrap', color: currentStep > i ? '#22C55E' : currentStep === i ? '#0EA5E9' : '#475569' }}>
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1.5, marginBottom: 20, marginLeft: 4, marginRight: 4, background: currentStep > i ? '#22C55E' : 'rgba(255,255,255,0.06)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>
          ❌ {error}
        </div>
      )}

      {txHash && currentStep === 3 && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Initiated! <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', textDecoration: 'underline' }}>View ↗</a>
        </div>
      )}

      <button onClick={handleBridge} disabled={loading || !amount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount ? 'rgba(255,255,255,0.04)'
            : `linear-gradient(135deg, ${chainColor}, #0EA5E9)`,
          color: loading || !amount ? '#475569' : '#fff',
          boxShadow: !loading && amount ? `0 0 24px ${chainColor}30` : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ Step ${currentStep + 1}/4...` : `Bridge ${amount || '0'} USDC → ARC`}
      </button>
    </div>
  )
}