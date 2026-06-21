'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256, encodeFunctionData } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI, SIMPLE_AMM_ABI } from '@/lib/contracts'
import { useToast } from '@/components/ui/Toast'

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: 11, color: '#64748B', fontFamily: 'monospace',
  letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'block'
}

const SLIPPAGE_OPTIONS = ['0.5', '1', '2']

export default function SwapPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [direction, setDirection] = useState<'AtoB' | 'BtoA'>('AtoB')
  const [amount, setAmount] = useState('')
  const [estimated, setEstimated] = useState('0.00')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [reserves, setReserves] = useState<{ a: string; b: string } | null>(null)
  const [slippage, setSlippage] = useState('0.5')
  const [customSlippage, setCustomSlippage] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [alreadyApproved, setAlreadyApproved] = useState(false)

  const fromToken = direction === 'AtoB' ? 'USDC' : 'EURC'
  const toToken = direction === 'AtoB' ? 'EURC' : 'USDC'
  const fromColor = direction === 'AtoB' ? '#0EA5E9' : '#818CF8'
  const toColor = direction === 'AtoB' ? '#818CF8' : '#0EA5E9'
  const tokenAddress = direction === 'AtoB' ? CONTRACTS.USDC : CONTRACTS.EURC
  const activeSlippage = showCustom ? customSlippage : slippage

  const fetchReserves = async () => {
    if (!publicClient) return
    try {
      const [rA, rB] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI, functionName: 'reserveA' }) as Promise<bigint>,
        publicClient.readContract({ address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI, functionName: 'reserveB' }) as Promise<bigint>,
      ])
      setReserves({ a: parseFloat(formatUnits(rA, 6)).toFixed(2), b: parseFloat(formatUnits(rB, 6)).toFixed(2) })
    } catch {}
  }

  useEffect(() => { fetchReserves() }, [publicClient])

  // Check allowance when amount/direction changes
  useEffect(() => {
    if (!publicClient || !address || !amount) { setAlreadyApproved(false); return }
    const check = async () => {
      try {
        const allowance = await publicClient.readContract({
          address: tokenAddress, abi: ERC20_ABI,
          functionName: 'allowance', args: [address, CONTRACTS.SIMPLE_AMM],
        }) as bigint
        setAlreadyApproved(allowance >= parseUnits(amount || '0', 6))
      } catch { setAlreadyApproved(false) }
    }
    check()
  }, [amount, direction, address, publicClient])

  const getEstimate = async (val: string) => {
    setAmount(val)
    if (!val || parseFloat(val) <= 0 || !publicClient) { setEstimated('0.00'); return }
    try {
      const out = await publicClient.readContract({
        address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI,
        functionName: 'getAmountOut',
        args: [parseUnits(val, 6), direction === 'AtoB'],
      }) as bigint
      setEstimated(parseFloat(formatUnits(out, 6)).toFixed(4))
    } catch { setEstimated('0.00') }
  }

  const priceImpact = (() => {
    if (!reserves || !amount || parseFloat(amount) <= 0) return 0
    const reserveIn = direction === 'AtoB' ? parseFloat(reserves.a) : parseFloat(reserves.b)
    if (reserveIn <= 0) return 0
    return (parseFloat(amount) / reserveIn) * 100
  })()

  const handleSwap = async () => {
    if (!isConnected || !walletClient || !publicClient || !address) {
      setError('Connect wallet first'); return
    }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter valid amount'); return }
    setError(''); setLoading(true); setTxHash(''); setStatus('')

    try {
      const amountIn = parseUnits(amount, 6)
      const swapFn = direction === 'AtoB' ? 'swapAForB' : 'swapBForA'

      if (!alreadyApproved) {
        // Need approve first
        setStatus('Step 1/2: Approve token in wallet...')
        const approveTx = await walletClient.writeContract({
          address: tokenAddress, abi: ERC20_ABI,
          functionName: 'approve', args: [CONTRACTS.SIMPLE_AMM, maxUint256],
        })
        setStatus(`Approve sent! Waiting 10s... (${approveTx.slice(0,10)}...)`)
        await new Promise(r => setTimeout(r, 10000))
        toast.show({ type: 'info', title: 'Token approved!', desc: `${fromToken} ready to swap` })
        setAlreadyApproved(true)

        // Now swap
        setStatus('Step 2/2: Sign swap in wallet...')
        const swapTx = await walletClient.writeContract({
          address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI,
          functionName: swapFn, args: [amountIn],
        })
        setStatus(`Swap sent! Confirming... (${swapTx.slice(0,10)}...)`)
        await new Promise(r => setTimeout(r, 8000))
        setTxHash(swapTx)
        finishSwap(swapTx)
      } else {
        // Already approved — 1 sign only! (batch-like UX)
        setStatus('⚡ Already approved — 1 sign only! Sign swap in wallet...')
        toast.show({ type: 'info', title: '⚡ 1-click swap!', desc: 'Already approved, signing swap only' })
        const swapTx = await walletClient.writeContract({
          address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI,
          functionName: swapFn, args: [amountIn],
        })
        setStatus(`Swap sent! Confirming... (${swapTx.slice(0,10)}...)`)
        await new Promise(r => setTimeout(r, 8000))
        setTxHash(swapTx)
        finishSwap(swapTx)
      }
    } catch (e: any) {
      const errMsg = e.shortMessage || e.message?.slice(0, 100) || 'Swap failed'
      setError(errMsg); setStatus('')
      toast.show({ type: 'error', title: 'Swap failed', desc: errMsg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  const finishSwap = (hash: `0x${string}`) => {
    setStatus('')
    setAmount('')
    setEstimated('0.00')
    fetchReserves()

    // Save to history
    try {
      const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
      localStorage.setItem('arcflow_tx_history', JSON.stringify([
        { hash, type: 'swap', amount, fromToken, toToken, estimated, timestamp: Date.now() },
        ...history
      ].slice(0, 50)))
    } catch {}

    onSuccess?.({ type: 'swap', amount, fromToken, toToken, hash })
    toast.show({
      type: 'success', title: 'Swap successful!',
      desc: `${amount} ${fromToken} → ${estimated} ${toToken}`,
      link: `https://testnet.arcscan.app/tx/${hash}`,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Already approved badge */}
      {alreadyApproved && amount && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10,
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          fontSize: 11, fontFamily: 'monospace', color: '#22C55E'
        }}>
          ⚡ Already approved — next swap is 1-click only!
        </div>
      )}

      {/* You Pay */}
      <div>
        <label style={labelStyle}>You Pay</label>
        <div style={{ position: 'relative' }}>
          <input type="number" placeholder="0.00" value={amount}
            onChange={e => getEstimate(e.target.value)}
            style={{ ...inputStyle, paddingRight: 90 }} />
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            background: `${fromColor}15`, color: fromColor,
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${fromColor}30`
          }}>{fromToken}</span>
        </div>
      </div>

      {/* Direction */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => {
          setDirection(d => d === 'AtoB' ? 'BtoA' : 'AtoB')
          setAmount(''); setEstimated('0.00'); setError(''); setStatus('')
        }} style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '1px solid rgba(129,140,248,0.3)',
          background: 'rgba(129,140,248,0.08)', color: '#818CF8',
          fontSize: 20, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>↕</button>
      </div>

      {/* You Receive */}
      <div>
        <label style={labelStyle}>You Receive (estimated)</label>
        <div style={{ position: 'relative' }}>
          <div style={{ ...inputStyle, color: '#94A3B8', paddingRight: 90 }}>{estimated}</div>
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            background: `${toColor}15`, color: toColor,
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${toColor}30`
          }}>{toToken}</span>
        </div>
      </div>

      {/* Price Impact */}
      {priceImpact > 2 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderRadius: 10, background: 'rgba(245,158,11,0.06)',
          border: `1px solid rgba(245,158,11,${priceImpact > 5 ? '0.4' : '0.2'})`,
        }}>
          <span>⚠</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: priceImpact > 5 ? '#EF4444' : '#F59E0B' }}>
            Price impact {priceImpact.toFixed(1)}% — {priceImpact > 5 ? 'HIGH RISK!' : 'large vs pool'}
          </span>
        </div>
      )}

      {/* Pool Reserves */}
      {reserves && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginBottom: 4 }}>POOL USDC</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0EA5E9', fontFamily: 'monospace' }}>{reserves.a}</div>
          </div>
          <div style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginBottom: 4 }}>POOL EURC</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#818CF8', fontFamily: 'monospace' }}>{reserves.b}</div>
          </div>
        </div>
      )}

      {/* Slippage */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, background: '#111628',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>Slippage</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {SLIPPAGE_OPTIONS.map(s => (
            <button key={s} onClick={() => { setSlippage(s); setShowCustom(false) }}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'monospace', border: 'none',
                background: !showCustom && slippage === s ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: !showCustom && slippage === s ? '#0EA5E9' : '#64748B',
                outline: !showCustom && slippage === s ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>{s}%</button>
          ))}
          <button onClick={() => setShowCustom(true)}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'monospace', border: 'none',
              background: showCustom ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: showCustom ? '#0EA5E9' : '#64748B',
              outline: showCustom ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>Custom</button>
        </div>
      </div>

      {showCustom && (
        <div style={{ position: 'relative' }}>
          <input type="number" placeholder="0.5" value={customSlippage}
            onChange={e => setCustomSlippage(e.target.value)}
            style={{ ...inputStyle, paddingRight: 40 }} />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: 13 }}>%</span>
        </div>
      )}

      {/* Info */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, background: '#111628',
        border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontFamily: 'monospace'
      }}>
        <span style={{ color: '#64748B' }}>SimpleAMM · 0.3% fee · Slippage {activeSlippage}%</span>
        <a href={`https://testnet.arcscan.app/address/${CONTRACTS.SIMPLE_AMM}`}
          target="_blank" rel="noreferrer"
          style={{ color: '#818CF8', textDecoration: 'underline' }}>
          View contract ↗
        </a>
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
          ✅ Swap done!{' '}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ color: '#22C55E', textDecoration: 'underline' }}>View on ArcScan ↗</a>
        </div>
      )}

      <button onClick={handleSwap} disabled={loading || !amount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount ? '#111628' : priceImpact > 5 ? '#EF4444' : '#818CF8',
          color: loading || !amount ? '#64748B' : '#fff',
          boxShadow: !loading && amount ? `0 0 24px ${priceImpact > 5 ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.3)'}` : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Processing...'}` :
          alreadyApproved && amount ? `⚡ 1-Click Swap ${fromToken} → ${toToken}` :
          priceImpact > 5 ? `⚠ Swap anyway (High Impact)` :
          `Swap ${fromToken} → ${toToken}`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}