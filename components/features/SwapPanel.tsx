'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI, SIMPLE_AMM_ABI } from '@/lib/contracts'
import { useToast } from '@/components/ui/Toast'
import { TokenLogo, TokenSelectorModal, ARC_TOKENS } from '@/lib/tokens'

const SLIPPAGE_OPTIONS = ['0.5', '1', '2']

// Only USDC/EURC supported in SimpleAMM
const SWAP_TOKENS = ARC_TOKENS.filter(t => ['USDC', 'EURC'].includes(t.symbol))

export default function SwapPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [fromToken, setFromToken] = useState(SWAP_TOKENS[0])
  const [toToken, setToToken] = useState(SWAP_TOKENS[1])
  const [amount, setAmount] = useState('')
  const [estimated, setEstimated] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [reserves, setReserves] = useState<{ a: string; b: string } | null>(null)
  const [slippage, setSlippage] = useState('0.5')
  const [showCustomSlippage, setShowCustomSlippage] = useState(false)
  const [customSlippage, setCustomSlippage] = useState('')
  const [alreadyApproved, setAlreadyApproved] = useState(false)
  const [fromBalance, setFromBalance] = useState('0.00')
  const [toBalance, setToBalance] = useState('0.00')
  const [showSettings, setShowSettings] = useState(false)
  const [showFromModal, setShowFromModal] = useState(false)
  const [showToModal, setShowToModal] = useState(false)

  const direction = fromToken.symbol === 'USDC' ? 'AtoB' : 'BtoA'
  const activeSlippage = showCustomSlippage ? customSlippage : slippage

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

  useEffect(() => {
    if (!publicClient || !address) return
    const from = fromToken.address as `0x${string}`
    const to = toToken.address as `0x${string}`
    Promise.all([
      publicClient.readContract({ address: from, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: to, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
    ]).then(([f, t]) => {
      setFromBalance(parseFloat(formatUnits(f, fromToken.decimals)).toFixed(4))
      setToBalance(parseFloat(formatUnits(t, toToken.decimals)).toFixed(4))
    }).catch(() => {})
  }, [fromToken, toToken, address, publicClient])

  useEffect(() => {
    if (!publicClient || !address || !amount) { setAlreadyApproved(false); return }
    publicClient.readContract({
      address: fromToken.address as `0x${string}`, abi: ERC20_ABI,
      functionName: 'allowance', args: [address, CONTRACTS.SIMPLE_AMM],
    }).then(a => setAlreadyApproved((a as bigint) >= parseUnits(amount || '0', fromToken.decimals)))
      .catch(() => setAlreadyApproved(false))
  }, [amount, fromToken, address, publicClient])

  const getEstimate = async (val: string) => {
    setAmount(val)
    if (!val || parseFloat(val) <= 0 || !publicClient) { setEstimated(''); return }
    try {
      const out = await publicClient.readContract({
        address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI,
        functionName: 'getAmountOut',
        args: [parseUnits(val, fromToken.decimals), direction === 'AtoB'],
      }) as bigint
      setEstimated(parseFloat(formatUnits(out, toToken.decimals)).toFixed(4))
    } catch { setEstimated('') }
  }

  const priceImpact = (() => {
    if (!reserves || !amount || parseFloat(amount) <= 0) return 0
    const rIn = direction === 'AtoB' ? parseFloat(reserves.a) : parseFloat(reserves.b)
    return rIn > 0 ? (parseFloat(amount) / rIn) * 100 : 0
  })()

  const rate = estimated && amount ? (parseFloat(estimated) / parseFloat(amount)).toFixed(4) : null

  const handleSwapTokens = () => {
    const tmp = fromToken
    setFromToken(toToken)
    setToToken(tmp)
    setAmount('')
    setEstimated('')
    setError('')
    setStatus('')
  }

  const handleSwap = async () => {
    if (!isConnected || !walletClient || !publicClient || !address) { setError('Connect wallet first'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter valid amount'); return }
    if (fromToken.symbol !== 'USDC' && fromToken.symbol !== 'EURC') {
      setError('Only USDC ↔ EURC swap supported on SimpleAMM'); return
    }

    setError(''); setLoading(true); setTxHash(''); setStatus('')

    try {
      const amountIn = parseUnits(amount, fromToken.decimals)
      const swapFn = direction === 'AtoB' ? 'swapAForB' : 'swapBForA'

      if (!alreadyApproved) {
        setStatus('Approve token in wallet...')
        await walletClient.writeContract({
          address: fromToken.address as `0x${string}`,
          abi: ERC20_ABI, functionName: 'approve',
          args: [CONTRACTS.SIMPLE_AMM, maxUint256],
        })
        setStatus('Waiting for approval...')
        await new Promise(r => setTimeout(r, 10000))
        toast.show({ type: 'info', title: 'Approved!', desc: `${fromToken.symbol} ready` })
        setAlreadyApproved(true)
      }

      setStatus('Sign swap in wallet...')
      const hash = await walletClient.writeContract({
        address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI,
        functionName: swapFn, args: [amountIn],
      })
      setStatus('Confirming...')
      await new Promise(r => setTimeout(r, 8000))

      setTxHash(hash)
      setStatus('')
      setAmount('')
      setEstimated('')
      fetchReserves()

      try {
        const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
        localStorage.setItem('arcflow_tx_history', JSON.stringify([
          { hash, type: 'swap', amount, fromToken: fromToken.symbol, toToken: toToken.symbol, estimated, timestamp: Date.now() },
          ...history
        ].slice(0, 50)))
      } catch {}

      onSuccess?.({ type: 'swap', amount, fromToken: fromToken.symbol, toToken: toToken.symbol, hash })
      toast.show({
        type: 'success', title: 'Swap done!',
        desc: `${amount} ${fromToken.symbol} → ${estimated} ${toToken.symbol}`,
        link: `https://testnet.arcscan.app/tx/${hash}`
      })
    } catch (e: any) {
      const msg = e.shortMessage || e.message?.slice(0, 100) || 'Swap failed'
      setError(msg); setStatus('')
      toast.show({ type: 'error', title: 'Swap failed', desc: msg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Top bar: label + settings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', borderBottom: '2px solid #6366F1', paddingBottom: 4 }}>Swap</span>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} style={{
          background: showSettings ? 'rgba(99,102,241,0.1)' : 'transparent',
          border: `1px solid ${showSettings ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
          color: showSettings ? '#818CF8' : '#64748B', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 4
        }}>
          <span>⚙</span>
          {showSettings && <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{activeSlippage}%</span>}
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Slippage Tolerance</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SLIPPAGE_OPTIONS.map(s => (
              <button key={s} onClick={() => { setSlippage(s); setShowCustomSlippage(false) }}
                style={{
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  fontFamily: 'monospace', border: 'none',
                  background: !showCustomSlippage && slippage === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  color: !showCustomSlippage && slippage === s ? '#818CF8' : '#94A3B8',
                  outline: !showCustomSlippage && slippage === s ? '1px solid rgba(99,102,241,0.4)' : 'none',
                }}>{s}%</button>
            ))}
            <button onClick={() => setShowCustomSlippage(true)}
              style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                fontFamily: 'monospace', border: 'none',
                background: showCustomSlippage ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                color: showCustomSlippage ? '#818CF8' : '#94A3B8',
              }}>Custom</button>
            {showCustomSlippage && (
              <div style={{ position: 'relative' }}>
                <input type="number" placeholder="0.5" value={customSlippage}
                  onChange={e => setCustomSlippage(e.target.value)}
                  style={{ width: 70, padding: '6px 22px 6px 10px', borderRadius: 8, background: '#111628', border: '1px solid rgba(99,102,241,0.3)', color: '#F1F5F9', fontSize: 12, outline: 'none' }} />
                <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: 11 }}>%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FROM */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
            Balance: <span style={{ color: '#94A3B8' }}>{fromBalance}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="number" placeholder="0.0" value={amount}
            onChange={e => getEstimate(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 28, fontWeight: 700, color: amount ? '#F1F5F9' : '#475569',
              padding: 0, minWidth: 0
            }} />
          {/* Token selector button */}
          <button onClick={() => setShowFromModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
            transition: 'all 0.15s', flexShrink: 0
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <TokenLogo symbol={fromToken.symbol} size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>{fromToken.symbol}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>▼</span>
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>~${parseFloat(amount || '0').toFixed(2)}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => getEstimate((parseFloat(fromBalance) / 2).toFixed(6))}
              style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', fontFamily: 'monospace' }}>HALF</button>
            <button onClick={() => getEstimate(fromBalance)}
              style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', fontFamily: 'monospace' }}>MAX</button>
          </div>
        </div>
      </div>

      {/* Swap button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={handleSwapTokens} style={{
          width: 38, height: 38, borderRadius: '50%',
          border: '2px solid #0d1117', background: '#161b27',
          color: '#818CF8', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 4px #0d1117', transition: 'transform 0.3s'
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'rotate(180deg)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
        >⇅</button>
      </div>

      {/* TO */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px', marginTop: -8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>For</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
            Balance: <span style={{ color: '#94A3B8' }}>{toBalance}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 28, fontWeight: 700, color: estimated ? '#F1F5F9' : '#475569' }}>
            {estimated || '0.0'}
          </div>
          {/* Token selector button */}
          <button onClick={() => setShowToModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
            transition: 'all 0.15s', flexShrink: 0
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <TokenLogo symbol={toToken.symbol} size={24} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>{toToken.symbol}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>▼</span>
          </button>
        </div>
        <span style={{ fontSize: 11, color: '#475569', display: 'block', marginTop: 8 }}>
          ~${parseFloat(estimated || '0').toFixed(2)}
        </span>
      </div>

      {/* Warning if non-AMM tokens selected */}
      {(fromToken.symbol !== 'USDC' && fromToken.symbol !== 'EURC') && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 11, color: '#F59E0B', fontFamily: 'monospace' }}>
          ⚠ Only USDC ↔ EURC swap available via SimpleAMM. Other tokens coming soon.
        </div>
      )}

      {/* Price info */}
      {rate && amount && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', borderRadius: 10, background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.06)', fontSize: 11
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748B', fontFamily: 'monospace' }}>
              1 {fromToken.symbol} = {rate} {toToken.symbol}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontFamily: 'monospace' }}>
            {priceImpact > 0 && (
              <span style={{ color: priceImpact > 5 ? '#EF4444' : priceImpact > 2 ? '#F59E0B' : '#22C55E' }}>
                {priceImpact.toFixed(2)}% impact
              </span>
            )}
            <span style={{ color: '#64748B' }}>{activeSlippage}% slip</span>
          </div>
        </div>
      )}

      {/* Pool reserves */}
      {reserves && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { sym: 'USDC', val: reserves.a, color: '#2775CA' },
            { sym: 'EURC', val: reserves.b, color: '#0052CC' },
          ].map(r => (
            <div key={r.sym} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <TokenLogo symbol={r.sym} size={20} />
              <div>
                <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase' }}>Pool {r.sym}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', fontFamily: 'monospace' }}>{r.val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved badge */}
      {alreadyApproved && amount && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11, color: '#22C55E', fontFamily: 'monospace' }}>
          ⚡ Token approved — 1-click swap ready!
        </div>
      )}

      {/* Price impact warning */}
      {priceImpact > 5 && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#EF4444', fontFamily: 'monospace' }}>
          ⚠ HIGH price impact {priceImpact.toFixed(1)}% — consider smaller amount
        </div>
      )}

      {/* Contract */}
      <div style={{ textAlign: 'center' }}>
        <a href={`https://testnet.arcscan.app/address/${CONTRACTS.SIMPLE_AMM}`}
          target="_blank" rel="noreferrer"
          style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', textDecoration: 'underline' }}>
          SimpleAMM · 0.3% fee · View contract ↗
        </a>
      </div>

      {status && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', color: '#818CF8', fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#818CF8', display: 'inline-block', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          {status}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>
          ❌ {error}
        </div>
      )}

      {txHash && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Done! <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', textDecoration: 'underline' }}>View on ArcScan ↗</a>
        </div>
      )}

      <button onClick={handleSwap} disabled={loading || !amount || (fromToken.symbol !== 'USDC' && fromToken.symbol !== 'EURC')}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount ? 'rgba(255,255,255,0.04)'
            : priceImpact > 5 ? 'linear-gradient(135deg, #EF4444, #DC2626)'
            : 'linear-gradient(135deg, #6366F1, #818CF8)',
          color: loading || !amount ? '#475569' : '#fff',
          boxShadow: !loading && amount ? '0 0 24px rgba(99,102,241,0.2)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Processing...'}` :
          !amount ? 'Enter amount' :
          (fromToken.symbol !== 'USDC' && fromToken.symbol !== 'EURC') ? 'Token not supported yet' :
          alreadyApproved ? `⚡ Swap ${fromToken.symbol} → ${toToken.symbol}` :
          `Swap ${fromToken.symbol} → ${toToken.symbol}`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Token Selector Modals */}
      {showFromModal && (
        <TokenSelectorModal
          onSelect={t => { setFromToken(t); setAmount(''); setEstimated('') }}
          onClose={() => setShowFromModal(false)}
          exclude={toToken.symbol}
        />
      )}
      {showToModal && (
        <TokenSelectorModal
          onSelect={t => { setToToken(t); setAmount(''); setEstimated('') }}
          onClose={() => setShowToModal(false)}
          exclude={fromToken.symbol}
        />
      )}
    </div>
  )
}