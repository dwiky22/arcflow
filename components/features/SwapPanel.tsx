'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI, SIMPLE_AMM_ABI } from '@/lib/contracts'

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: 11, color: '#64748B', fontFamily: 'monospace',
  letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'block'
}

export default function SwapPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [direction, setDirection] = useState<'AtoB' | 'BtoA'>('AtoB')
  const [amount, setAmount] = useState('')
  const [estimated, setEstimated] = useState('0.00')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [needsApprove, setNeedsApprove] = useState(true)

  const fromToken = direction === 'AtoB' ? 'USDC' : 'EURC'
  const toToken = direction === 'AtoB' ? 'EURC' : 'USDC'
  const fromColor = direction === 'AtoB' ? '#0EA5E9' : '#818CF8'
  const toColor = direction === 'AtoB' ? '#818CF8' : '#0EA5E9'
  const tokenAddress = direction === 'AtoB' ? CONTRACTS.USDC : CONTRACTS.EURC

  const getEstimate = async (val: string) => {
    setAmount(val)
    if (!val || parseFloat(val) <= 0 || !publicClient) { setEstimated('0.00'); return }
    try {
      const out = await publicClient.readContract({
        address: CONTRACTS.SIMPLE_AMM,
        abi: SIMPLE_AMM_ABI,
        functionName: 'getAmountOut',
        args: [parseUnits(val, 6), direction === 'AtoB'],
      }) as bigint
      setEstimated(parseFloat(formatUnits(out, 6)).toFixed(4))

      // Check allowance
      if (address) {
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.SIMPLE_AMM],
        }) as bigint
        setNeedsApprove(allowance < parseUnits(val, 6))
      }
    } catch { setEstimated('0.00') }
  }

  const handleApprove = async () => {
    if (!walletClient || !address) return
    setError(''); setLoading(true)
    setStatus('Approve in your wallet...')
    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.SIMPLE_AMM, maxUint256],
      })
      setStatus(`Approve sent! (${hash.slice(0,10)}...) Waiting ~10s...`)
      // Wait 10 seconds flat — enough for ARC testnet
      await new Promise(r => setTimeout(r, 10000))
      setNeedsApprove(false)
      setStatus('')
    } catch (e: any) {
      setError(e.shortMessage || 'Approve cancelled')
      setStatus('')
    } finally { setLoading(false) }
  }

  const handleSwap = async () => {
    if (!isConnected || !walletClient || !address) { setError('Connect wallet first'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter valid amount'); return }
    setError(''); setLoading(true); setTxHash('')
    setStatus('Sign swap in your wallet...')
    try {
      const amountIn = parseUnits(amount, 6)
      const swapFn = direction === 'AtoB' ? 'swapAForB' : 'swapBForA'
      const hash = await walletClient.writeContract({
        address: CONTRACTS.SIMPLE_AMM,
        abi: SIMPLE_AMM_ABI,
        functionName: swapFn,
        args: [amountIn],
      })
      setStatus(`Swap sent! (${hash.slice(0,10)}...) Confirming...`)
      // Wait 8 seconds flat
      await new Promise(r => setTimeout(r, 8000))
      setTxHash(hash)
      setStatus('')
      setAmount('')
      setEstimated('0.00')
      setNeedsApprove(true)
      onSuccess?.({ type: 'swap', amount, fromToken, toToken, hash })
    } catch (e: any) {
      setError(e.shortMessage || e.message?.slice(0,100) || 'Swap failed')
      setStatus('')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => {
          setDirection(d => d === 'AtoB' ? 'BtoA' : 'AtoB')
          setAmount(''); setEstimated('0.00'); setError(''); setStatus(''); setNeedsApprove(true)
        }} style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '1px solid rgba(129,140,248,0.3)',
          background: 'rgba(129,140,248,0.08)', color: '#818CF8',
          fontSize: 20, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>↕</button>
      </div>

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

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12, background: '#111628',
        border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontFamily: 'monospace'
      }}>
        <span style={{ color: '#64748B' }}>SimpleAMM · 0.3% fee · x·y=k</span>
        <span style={{ color: '#818CF8' }}>ARC Testnet</span>
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
          ✅ Swap berhasil! Token masuk ke wallet kamu!{' '}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ color: '#22C55E', textDecoration: 'underline' }}>
            View on ArcScan ↗
          </a>
        </div>
      )}

      {/* Buttons */}
      {needsApprove && amount ? (
        <button onClick={handleApprove} disabled={loading}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
            background: loading ? '#111628' : '#0EA5E9',
            color: loading ? '#64748B' : '#000', transition: 'all 0.2s'
          }}>
          {loading ? '⟳ Approving...' : `Approve ${fromToken}`}
        </button>
      ) : (
        <button onClick={handleSwap} disabled={loading || !amount}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: loading || !amount ? 'not-allowed' : 'pointer', border: 'none',
            background: loading || !amount ? '#111628' : '#818CF8',
            color: loading || !amount ? '#64748B' : '#fff',
            boxShadow: !loading && amount ? '0 0 24px rgba(129,140,248,0.3)' : 'none',
            transition: 'all 0.2s'
          }}>
          {loading ? '⟳ Swapping...' : `Swap ${fromToken} → ${toToken}`}
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}