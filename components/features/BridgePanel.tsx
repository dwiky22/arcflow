'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { useToast } from '@/components/ui/Toast'

const BRIDGE_CHAINS = [
  { value: 'Ethereum_Sepolia', label: 'Ethereum Sepolia', short: 'Sepolia', logo: '⟠', color: '#627EEA', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', chainIdHex: '0xaa36a7', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Base_Sepolia', label: 'Base Sepolia', short: 'Base', logo: '🔵', color: '#0052FF', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', chainIdHex: '0x14a34', rpc: 'https://base-sepolia-rpc.publicnode.com', symbol: 'ETH' },
  { value: 'Arbitrum_Sepolia', label: 'Arbitrum Sepolia', short: 'Arbitrum', logo: '🔷', color: '#28A0F0', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', chainIdHex: '0x66eee', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', symbol: 'ETH' },
  { value: 'Avalanche_Fuji', label: 'Avalanche Fuji', short: 'Fuji', logo: '🔺', color: '#E84142', usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65', chainIdHex: '0xa869', rpc: 'https://api.avax-test.network/ext/bc/C/rpc', symbol: 'AVAX' },
  { value: 'Optimism_Sepolia', label: 'Optimism Sepolia', short: 'Optimism', logo: '🔴', color: '#FF0420', usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D9', chainIdHex: '0xaa37dc', rpc: 'https://sepolia.optimism.io', symbol: 'ETH' },
] as const

const USDC_ABI = ["function balanceOf(address) view returns (uint256)"]

const STEPS = [
  { id: 1, label: 'Switch network' },
  { id: 2, label: 'Approve token' },
  { id: 3, label: 'Burn & bridge' },
  { id: 4, label: 'Done' },
]

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
  const toast = useToast()

  const [fromChain, setFromChain] = useState<typeof BRIDGE_CHAINS[number]>(BRIDGE_CHAINS[1])
  const [amount, setAmount] = useState('')
  const [srcBalance, setSrcBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

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
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: cfg.chainIdHex, chainName: cfg.label, rpcUrls: [cfg.rpc], nativeCurrency: { name: cfg.symbol, symbol: cfg.symbol, decimals: 18 } }]
        })
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

      // Step 1
      setCurrentStep(1)
      toast.show({ type: 'info', title: 'Switching network...', desc: `Switching to ${fromChain.label}` })
      await switchToChain(fromChain)

      // Step 2
      setCurrentStep(2)
      toast.show({ type: 'info', title: 'Creating adapter...', desc: 'Approve token in wallet' })
      const { createEthersAdapterFromProvider } = await import('@circle-fin/adapter-ethers-v6')
      const adapter = await createEthersAdapterFromProvider({ provider: eth })

      const { BridgeKit } = await import('@circle-fin/bridge-kit')
      const kit = new BridgeKit()

      // Step 3
      setCurrentStep(3)
      toast.show({ type: 'info', title: 'Bridging...', desc: 'Confirm approve + burn in wallet' })

      const result = await kit.bridge({
        from: { adapter, chain: fromChain.value },
        to: { chain: 'Arc_Testnet', recipientAddress: address, useForwarder: true },
        amount,
      })

      const hash = (result as any)?.steps?.find((s: any) => s.name === 'mint' && s.txHash)?.txHash
        || (result as any)?.steps?.find((s: any) => s.txHash)?.txHash
        || ''

      // Step 4
      setCurrentStep(4)
      setTxHash(hash)
      setAmount('')
      setSrcBalance('')

      onSuccess?.({ type: 'bridge', amount, token: 'USDC', fromChain: fromChain.label, toChain: 'ARC Testnet', hash })
      toast.show({
        type: 'success',
        title: 'Bridge initiated!',
        desc: `${amount} USDC from ${fromChain.short} → ARC Testnet`,
        link: hash ? `https://testnet.arcscan.app/tx/${hash}` : undefined,
      })
    } catch (e: any) {
      setCurrentStep(0)
      if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
        setError('Transaction rejected in wallet')
        toast.show({ type: 'error', title: 'Rejected', desc: 'Transaction was rejected in wallet' })
      } else {
        const errMsg = e.message?.slice(0, 120) || 'Bridge failed'
        setError(errMsg)
        toast.show({ type: 'error', title: 'Bridge failed', desc: errMsg.slice(0, 60) })
      }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* From Chain */}
      <div>
        <label style={labelStyle}>From Chain</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BRIDGE_CHAINS.map(c => (
            <button key={c.value} onClick={() => setFromChain(c)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
              border: 'none', textAlign: 'left', transition: 'all 0.15s',
              background: fromChain.value === c.value ? `${c.color}12` : '#111628',
              outline: fromChain.value === c.value ? `1px solid ${c.color}40` : '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 20 }}>{c.logo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: fromChain.value === c.value ? c.color : '#F1F5F9' }}>
                  {c.label}
                </div>
                {fromChain.value === c.value && srcBalance && (
                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
                    Balance: {srcBalance} USDC
                  </div>
                )}
              </div>
              {fromChain.value === c.value && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* To Chain - Fixed */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)'
      }}>
        <span style={{ fontSize: 20 }}>🟢</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>ARC Testnet</div>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>Destination · Chain 5042002</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', color: '#22C55E',
          padding: '3px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          Fixed
        </div>
      </div>

      {/* Amount */}
      <div>
        <label style={labelStyle}>Amount (USDC)</label>
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

      {/* Progress Stepper */}
      {(loading || currentStep === 4) && (
        <div style={{
          padding: '16px', borderRadius: 12,
          background: '#111628', border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 12 }}>
            BRIDGE PROGRESS
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map((step, i) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: currentStep > step.id ? 14 : 11, fontWeight: 700,
                    background: currentStep > step.id ? '#22C55E'
                      : currentStep === step.id ? 'rgba(14,165,233,0.15)' : '#0a0d18',
                    border: currentStep > step.id ? 'none'
                      : currentStep === step.id ? '2px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
                    color: currentStep > step.id ? '#06080f'
                      : currentStep === step.id ? '#0EA5E9' : '#475569',
                  }}>
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <span style={{
                    fontSize: 9, fontFamily: 'monospace', whiteSpace: 'nowrap',
                    color: currentStep > step.id ? '#22C55E'
                      : currentStep === step.id ? '#0EA5E9' : '#475569'
                  }}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 20, marginLeft: 4, marginRight: 4,
                    background: currentStep > step.id ? '#22C55E' : 'rgba(255,255,255,0.06)',
                    transition: 'background 0.3s'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
        fontSize: 11, color: '#F59E0B', fontFamily: 'monospace'
      }}>
        ⚠ Wallet will switch to {fromChain.label}. Don't close tab during bridging (~2-5 min).
      </div>

      {/* Info */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, background: '#111628',
        border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontFamily: 'monospace'
      }}>
        <span style={{ color: '#64748B' }}>Circle CCTP · Forwarder auto-mint · Native burn</span>
        <span style={{ color: '#22C55E' }}>~2-5 min</span>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {txHash && currentStep === 4 && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Bridge initiated! USDC arriving on ARC in ~2-5 min.{' '}
          {txHash && (
            <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
              style={{ color: '#22C55E', textDecoration: 'underline' }}>
              View on ArcScan ↗
            </a>
          )}
        </div>
      )}

      <button onClick={handleBridge} disabled={loading || !amount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount ? '#111628' : '#0EA5E9',
          color: loading || !amount ? '#64748B' : '#000',
          boxShadow: !loading && amount ? '0 0 24px rgba(14,165,233,0.3)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ Step ${currentStep}/4 — processing...` : `Bridge ${amount || '0'} USDC → ARC`}
      </button>
    </div>
  )
}