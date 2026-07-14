'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { ethers } from 'ethers'
import { useToast } from '@/components/ui/Toast'
import { ChainLogo, TokenLogo } from '@/lib/tokens'

// Testnet chains
const TESTNET_CHAINS = [
  { value: 'Ethereum_Sepolia', label: 'Ethereum Sepolia', short: 'Sepolia', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', chainIdHex: '0xaa36a7', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH', arcChain: 'Arc_Testnet' },
  { value: 'Base_Sepolia', label: 'Base Sepolia', short: 'Base', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', chainIdHex: '0x14a34', rpc: 'https://base-sepolia-rpc.publicnode.com', symbol: 'ETH', arcChain: 'Arc_Testnet' },
  { value: 'Arbitrum_Sepolia', label: 'Arbitrum Sepolia', short: 'Arbitrum', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', chainIdHex: '0x66eee', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', symbol: 'ETH', arcChain: 'Arc_Testnet' },
  { value: 'Avalanche_Fuji', label: 'Avalanche Fuji', short: 'Fuji', usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65', chainIdHex: '0xa869', rpc: 'https://api.avax-test.network/ext/bc/C/rpc', symbol: 'AVAX', arcChain: 'Arc_Testnet' },
  { value: 'Optimism_Sepolia', label: 'Optimism Sepolia', short: 'Optimism', usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D9', chainIdHex: '0xaa37dc', rpc: 'https://sepolia.optimism.io', symbol: 'ETH', arcChain: 'Arc_Testnet' },
] as const

// Mainnet chains
const MAINNET_CHAINS = [
  { value: 'Ethereum', label: 'Ethereum', short: 'Ethereum', usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainIdHex: '0x1', rpc: 'https://ethereum-rpc.publicnode.com', symbol: 'ETH', arcChain: 'Arc_Mainnet' },
  { value: 'Base', label: 'Base', short: 'Base', usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', chainIdHex: '0x2105', rpc: 'https://mainnet.base.org', symbol: 'ETH', arcChain: 'Arc_Mainnet' },
  { value: 'Arbitrum', label: 'Arbitrum One', short: 'Arbitrum', usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', chainIdHex: '0xa4b1', rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', arcChain: 'Arc_Mainnet' },
  { value: 'Avalanche', label: 'Avalanche', short: 'Avalanche', usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', chainIdHex: '0xa86a', rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', arcChain: 'Arc_Mainnet' },
  { value: 'Optimism', label: 'Optimism', short: 'Optimism', usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', chainIdHex: '0xa', rpc: 'https://mainnet.optimism.io', symbol: 'ETH', arcChain: 'Arc_Mainnet' },
  { value: 'Polygon', label: 'Polygon', short: 'Polygon', usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', chainIdHex: '0x89', rpc: 'https://polygon-rpc.com', symbol: 'MATIC', arcChain: 'Arc_Mainnet' },
  { value: 'Solana', label: 'Solana', short: 'Solana', usdcAddress: '', chainIdHex: '', rpc: '', symbol: 'SOL', arcChain: 'Arc_Mainnet' },
] as const

// Chain logo keys mapping
const CHAIN_LOGO_KEY: Record<string, string> = {
  Ethereum_Sepolia: 'Ethereum_Sepolia',
  Base_Sepolia: 'Base_Sepolia',
  Arbitrum_Sepolia: 'Arbitrum_Sepolia',
  Avalanche_Fuji: 'Avalanche_Fuji',
  Optimism_Sepolia: 'Optimism_Sepolia',
  Ethereum: 'Ethereum_Sepolia',
  Base: 'Base_Sepolia',
  Arbitrum: 'Arbitrum_Sepolia',
  Avalanche: 'Avalanche_Fuji',
  Optimism: 'Optimism_Sepolia',
  Polygon: 'Polygon',
  Solana: 'Solana',
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum_Sepolia: '#627EEA', Base_Sepolia: '#0052FF',
  Arbitrum_Sepolia: '#28A0F0', Avalanche_Fuji: '#E84142',
  Optimism_Sepolia: '#FF0420',
  Ethereum: '#627EEA', Base: '#0052FF', Arbitrum: '#28A0F0',
  Avalanche: '#E84142', Optimism: '#FF0420',
  Polygon: '#8247E5', Solana: '#9945FF',
}

const USDC_ABI = ["function balanceOf(address) view returns (uint256)"]

const STEPS = ['Switch network', 'Approve token', 'Burn & bridge', 'Done ✓']

type TestnetChain = typeof TESTNET_CHAINS[number]
type MainnetChain = typeof MAINNET_CHAINS[number]
type BridgeChain = TestnetChain | MainnetChain

export default function BridgePanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const toast = useToast()

  const isMainnet = chainId === 5042
  const BRIDGE_CHAINS = isMainnet ? MAINNET_CHAINS : TESTNET_CHAINS

  const [fromChain, setFromChain] = useState<BridgeChain>(BRIDGE_CHAINS[1])
  const [amount, setAmount] = useState('')
  const [srcBalance, setSrcBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [showChainSelect, setShowChainSelect] = useState(false)

  // Reset when network changes
  useEffect(() => {
    const chains = isMainnet ? MAINNET_CHAINS : TESTNET_CHAINS
    setFromChain(chains[1])
    setAmount('')
    setSrcBalance('')
    setError('')
    setTxHash('')
  }, [isMainnet])

  const fetchBalance = async (cfg: BridgeChain) => {
    if (!address || !cfg.usdcAddress || !cfg.rpc) return
    try {
      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const usdc = new ethers.Contract(cfg.usdcAddress, USDC_ABI, provider)
      const bal = await usdc.balanceOf(address)
      setSrcBalance(parseFloat(ethers.formatUnits(bal, 6)).toFixed(2))
    } catch { setSrcBalance('') }
  }

  useEffect(() => { fetchBalance(fromChain) }, [fromChain, address])

  const switchToChain = async (cfg: BridgeChain) => {
    if (!cfg.chainIdHex || !cfg.rpc) throw new Error('Chain not supported yet')
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
    if (!fromChain.rpc) { setError('This chain not yet supported for bridging'); return }

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

      const destChain = isMainnet ? 'Arc_Mainnet' : 'Arc_Testnet'
      const result = await kit.bridge({
        from: { adapter, chain: fromChain.value as any },
        to: { chain: destChain as any, recipientAddress: address, useForwarder: true },
        amount,
      })

      const hash = (result as any)?.steps?.find((s: any) => s.txHash)?.txHash || ''
      setCurrentStep(3)
      setTxHash(hash)
      setAmount('')
      setSrcBalance('')

      onSuccess?.({ type: 'bridge', amount, token: 'USDC', fromChain: fromChain.label, toChain: isMainnet ? 'ARC Mainnet' : 'ARC Testnet', hash })
      toast.show({
        type: 'success', title: 'Bridge initiated!',
        desc: `${amount} USDC → ${isMainnet ? 'ARC Mainnet' : 'ARC Testnet'}`,
        link: hash ? `${isMainnet ? 'https://arc-mainnet.cloud.blockscout.com' : 'https://testnet.arcscan.app'}/tx/${hash}` : undefined
      })
    } catch (e: any) {
      setCurrentStep(-1)
      const msg = e?.code === 4001 ? 'Rejected in wallet' : e.message?.slice(0, 100) || 'Bridge failed'
      setError(msg)
      toast.show({ type: 'error', title: 'Bridge failed', desc: msg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  const chainColor = CHAIN_COLORS[fromChain.value] || '#0EA5E9'
  const logoKey = CHAIN_LOGO_KEY[fromChain.value] || fromChain.value
  const explorerUrl = isMainnet ? 'https://arc-mainnet.cloud.blockscout.com' : 'https://testnet.arcscan.app'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Network indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10,
        background: isMainnet ? 'rgba(34,197,94,0.06)' : 'rgba(14,165,233,0.06)',
        border: `1px solid ${isMainnet ? 'rgba(34,197,94,0.2)' : 'rgba(14,165,233,0.15)'}`,
        fontSize: 11, fontFamily: 'monospace',
        color: isMainnet ? '#22C55E' : '#0EA5E9'
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isMainnet ? '#22C55E' : '#0EA5E9', display: 'inline-block' }} />
        {isMainnet
          ? '⚡ Bridging to ARC Mainnet (Chain 5042) — Real USDC!'
          : '🧪 Bridging to ARC Testnet (Chain 5042002) — Test USDC only'}
      </div>

      {/* FROM Chain */}
      <div>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          From {isMainnet ? 'Mainnet' : 'Testnet'}
        </div>

        <button onClick={() => setShowChainSelect(!showChainSelect)} style={{
          width: '100%', padding: '14px 16px', borderRadius: 12,
          background: '#0d1117', border: `1px solid ${showChainSelect ? chainColor + '40' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left'
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <ChainLogo chain={logoKey} size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{fromChain.label}</div>
            {srcBalance && (
              <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
                Balance: {srcBalance} USDC
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden' }}>
              <TokenLogo symbol="USDC" size={18} />
            </div>
            <span style={{ color: '#64748B', fontSize: 11 }}>{showChainSelect ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Chain Dropdown */}
        {showChainSelect && (
          <div style={{
            marginTop: 4, borderRadius: 12, overflow: 'hidden',
            background: '#0a0d18', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            {BRIDGE_CHAINS.map(c => {
              const isSelected = fromChain.value === c.value
              const color = CHAIN_COLORS[c.value] || '#0EA5E9'
              const lKey = CHAIN_LOGO_KEY[c.value] || c.value
              return (
                <button key={c.value} onClick={() => { setFromChain(c as BridgeChain); setShowChainSelect(false) }}
                  style={{
                    width: '100%', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isSelected ? color + '10' : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    <ChainLogo chain={lKey} size={28} />
                  </div>
                  <span style={{ fontSize: 13, color: isSelected ? color : '#F1F5F9', fontWeight: isSelected ? 600 : 400, flex: 1 }}>
                    {c.label}
                  </span>
                  {c.value === 'Solana' && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontFamily: 'monospace' }}>soon</span>
                  )}
                  {isSelected && <span style={{ color, fontSize: 14 }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isMainnet ? '#22C55E' : '#0EA5E9', fontSize: 14
        }}>↕</div>
      </div>

      {/* TO — Arc (dynamic mainnet/testnet) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 12,
        background: isMainnet ? 'rgba(34,197,94,0.06)' : 'rgba(14,165,233,0.06)',
        border: `1px solid ${isMainnet ? 'rgba(34,197,94,0.2)' : 'rgba(14,165,233,0.2)'}`
      }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <ChainLogo chain="Arc_Testnet" size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: isMainnet ? '#22C55E' : '#0EA5E9' }}>
            {isMainnet ? 'ARC Mainnet' : 'ARC Testnet'}
          </div>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
            Destination · Chain {isMainnet ? '5042' : '5042002'}
          </div>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 6,
          background: isMainnet ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)',
          color: isMainnet ? '#22C55E' : '#0EA5E9',
          fontFamily: 'monospace', border: `1px solid ${isMainnet ? 'rgba(34,197,94,0.2)' : 'rgba(14,165,233,0.2)'}`
        }}>Fixed</span>
      </div>

      {/* Amount */}
      <div>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Amount</div>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, overflow: 'hidden', padding: '4px 4px 4px 16px'
        }}>
          <input type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 22, fontWeight: 700, color: '#F1F5F9', padding: '8px 0' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#111628', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '8px 14px', margin: 4
          }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden' }}>
              <TokenLogo symbol="USDC" size={20} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>USDC</span>
          </div>
        </div>
        {srcBalance && (
          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Available on {fromChain.short}: {srcBalance} USDC</span>
            <button onClick={() => setAmount(srcBalance)} style={{
              background: 'none', border: 'none', color: isMainnet ? '#22C55E' : '#0EA5E9',
              cursor: 'pointer', fontSize: 11, fontFamily: 'monospace'
            }}>MAX</button>
          </div>
        )}
      </div>

      {/* Route info */}
      {amount && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 10, background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.06)', fontSize: 11
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontFamily: 'monospace' }}>
            <span>⇄ via Circle CCTP</span>
          </div>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.08)', color: '#22C55E', fontFamily: 'monospace' }}>~2-5 min</span>
        </div>
      )}

      {/* Warning mainnet */}
      {isMainnet && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#EF4444', fontFamily: 'monospace' }}>
          ⚠ MAINNET — This uses real USDC! Double check amount before confirming.
        </div>
      )}

      {/* Warning testnet */}
      {!isMainnet && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 11, color: '#F59E0B', fontFamily: 'monospace' }}>
          ⚠ Wallet will switch to {fromChain.label}. Don't close tab during bridging.
        </div>
      )}

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
                    background: currentStep > i ? '#22C55E' : currentStep === i ? `${isMainnet ? '#22C55E' : '#0EA5E9'}15` : 'rgba(255,255,255,0.04)',
                    border: currentStep > i ? 'none' : currentStep === i ? `2px solid ${isMainnet ? '#22C55E' : '#0EA5E9'}` : '1px solid rgba(255,255,255,0.08)',
                    color: currentStep > i ? '#06080f' : currentStep === i ? (isMainnet ? '#22C55E' : '#0EA5E9') : '#475569',
                  }}>
                    {currentStep > i ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 8, fontFamily: 'monospace', whiteSpace: 'nowrap', color: currentStep > i ? '#22C55E' : currentStep === i ? (isMainnet ? '#22C55E' : '#0EA5E9') : '#475569' }}>
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
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>
          ❌ {error}
        </div>
      )}

      {txHash && currentStep === 3 && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Initiated!{' '}
          {txHash && <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', textDecoration: 'underline' }}>View ↗</a>}
        </div>
      )}

      <button onClick={handleBridge} disabled={loading || !amount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount
            ? 'rgba(255,255,255,0.04)'
            : isMainnet
            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
            : `linear-gradient(135deg, ${chainColor}, #0EA5E9)`,
          color: loading || !amount ? '#475569' : '#fff',
          boxShadow: !loading && amount ? `0 0 24px ${isMainnet ? 'rgba(34,197,94,0.3)' : 'rgba(14,165,233,0.3)'}` : 'none',
          transition: 'all 0.2s'
        }}>
        {loading
          ? `⟳ Step ${currentStep + 1}/4...`
          : `Bridge ${amount || '0'} USDC → ${isMainnet ? 'ARC Mainnet' : 'ARC Testnet'}`}
      </button>
    </div>
  )
}