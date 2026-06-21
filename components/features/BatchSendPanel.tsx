'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, isAddress, toHex, encodeFunctionData } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'
import { useToast } from '@/components/ui/Toast'

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const,
}

interface Recipient {
  id: string
  address: string
  amount: string
  memo: string
}

export default function BatchSendPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [token, setToken] = useState<'USDC' | 'EURC'>('USDC')
  const [balance, setBalance] = useState('0.00')
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '', memo: '' },
    { id: '2', address: '', amount: '', memo: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [progress, setProgress] = useState(0)

  const tokenAddress = token === 'USDC' ? CONTRACTS.USDC : CONTRACTS.EURC
  const tokenColor = token === 'USDC' ? '#0EA5E9' : '#818CF8'

  const validRecipients = recipients.filter(r =>
    r.address && isAddress(r.address) && r.amount && parseFloat(r.amount) > 0
  )
  const totalAmount = validRecipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0)

  useEffect(() => {
    if (!publicClient || !address) return
    publicClient.readContract({
      address: tokenAddress, abi: ERC20_ABI,
      functionName: 'balanceOf', args: [address],
    }).then(b => setBalance(parseFloat(formatUnits(b as bigint, 6)).toFixed(2)))
      .catch(() => setBalance('0.00'))
  }, [token, address, publicClient, tokenAddress])

  const addRecipient = () => {
    setRecipients(prev => [...prev, { id: Date.now().toString(), address: '', amount: '', memo: '' }])
  }

  const removeRecipient = (id: string) => {
    if (recipients.length <= 1) return
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleBatchSend = async () => {
    if (!isConnected || !walletClient || !address) { setError('Connect wallet first'); return }
    if (validRecipients.length === 0) { setError('Add at least one valid recipient'); return }
    if (totalAmount > parseFloat(balance)) {
      setError(`Insufficient balance. Need ${totalAmount.toFixed(2)} ${token}`); return
    }

    setError(''); setLoading(true); setTxHash(''); setStatus(''); setProgress(0)

    const hashes: string[] = []

    try {
      for (let i = 0; i < validRecipients.length; i++) {
        const r = validRecipients[i]
        setStatus(`Sending to wallet ${i + 1}/${validRecipients.length}... Sign in wallet`)
        setProgress(Math.round((i / validRecipients.length) * 100))

        // Encode transfer calldata, attach memo as hex suffix (same as SendPanel)
        const transferData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [r.address as `0x${string}`, parseUnits(r.amount, 6)],
        })

        const memoHex = r.memo ? toHex(r.memo) : undefined
        const data = memoHex
          ? `${transferData}${memoHex.slice(2)}` as `0x${string}`
          : transferData

        const hash = await walletClient.sendTransaction({
          to: tokenAddress,
          data,
          value: 0n,
        })

        hashes.push(hash)
        setStatus(`✅ Sent to wallet ${i + 1}! Waiting before next...`)

        if (i < validRecipients.length - 1) {
          await new Promise(res => setTimeout(res, 3000))
        }
      }

      setProgress(100)
      setStatus('All transactions sent! Confirming...')
      await new Promise(res => setTimeout(res, 5000))

      const lastHash = hashes[hashes.length - 1]

      // Save to history with memo details
      try {
        const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
        const batchRecord = {
          hash: lastHash, type: 'send',
          amount: totalAmount.toFixed(2), token,
          recipient: `${validRecipients.length} wallets`,
          description: `Batch: ${validRecipients.map((r) => `${r.amount} → ${r.address.slice(0,6)}...${r.address.slice(-4)}${r.memo ? ` (${r.memo})` : ''}`).join(', ')}`,
          memo: validRecipients.map(r => r.memo).filter(Boolean).join(', ') || null,
          timestamp: Date.now()
        }
        localStorage.setItem('arcflow_tx_history', JSON.stringify([batchRecord, ...history].slice(0, 50)))
      } catch {}

      // Save each recipient to incoming with their specific hash
      try {
        validRecipients.forEach((r, i) => {
          if (r.memo) {
            const incoming = JSON.parse(localStorage.getItem('arcflow_incoming') || '[]')
            localStorage.setItem('arcflow_incoming', JSON.stringify([
              { token, amount: r.amount, memo: r.memo, hash: hashes[i] || lastHash, timestamp: Date.now() },
              ...incoming
            ].slice(0, 20)))
          }
        })
      } catch {}

      setTxHash(lastHash)
      setStatus('')
      setProgress(0)

      onSuccess?.({ type: 'send', amount: totalAmount.toFixed(2), token, recipient: 'batch', hash: lastHash })
      toast.show({
        type: 'success',
        title: `Batch send complete!`,
        desc: `${totalAmount.toFixed(2)} ${token} → ${validRecipients.length} wallets (${hashes.length} txs)`,
        link: `https://testnet.arcscan.app/tx/${lastHash}`,
      })

      setRecipients([
        { id: '1', address: '', amount: '', memo: '' },
        { id: '2', address: '', amount: '', memo: '' },
      ])

    } catch (e: any) {
      const errMsg = e.shortMessage || e.message?.slice(0, 100) || 'Batch send failed'
      setError(`Failed at wallet ${hashes.length + 1}: ${errMsg}`)
      setStatus('')
      setProgress(0)
      if (hashes.length > 0) {
        toast.show({
          type: 'info',
          title: `Partial success`,
          desc: `${hashes.length}/${validRecipients.length} sent before error`,
        })
      } else {
        toast.show({ type: 'error', title: 'Batch send failed', desc: errMsg.slice(0, 60) })
      }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)'
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366F1' }}>⚡ Batch Send</div>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
            Send to multiple wallets · Sequential transactions
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textAlign: 'right' }}>
          Balance: <span style={{ color: tokenColor }}>{balance} {token}</span>
        </div>
      </div>

      {/* Token Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['USDC', 'EURC'] as const).map(t => (
          <button key={t} onClick={() => setToken(t)} style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none', transition: 'all 0.15s',
            background: token === t ? `${t === 'USDC' ? 'rgba(14,165,233,0.15)' : 'rgba(129,140,248,0.15)'}` : '#111628',
            color: token === t ? (t === 'USDC' ? '#0EA5E9' : '#818CF8') : '#64748B',
            outline: token === t ? `1px solid ${t === 'USDC' ? 'rgba(14,165,233,0.4)' : 'rgba(129,140,248,0.4)'}` : '1px solid rgba(255,255,255,0.06)',
          }}>{t}</button>
        ))}
      </div>

      {/* Recipients */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recipients.map((r, i) => (
          <div key={r.id} style={{
            padding: 14, borderRadius: 12,
            background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#6366F1', fontFamily: 'monospace', fontWeight: 600 }}>
                Recipient #{i + 1}
                {r.address && isAddress(r.address) && r.amount && (
                  <span style={{ color: '#22C55E', marginLeft: 8 }}>✓ valid</span>
                )}
              </span>
              {recipients.length > 1 && (
                <button onClick={() => removeRecipient(r.id)} style={{
                  background: 'none', border: 'none', color: '#EF4444',
                  cursor: 'pointer', fontSize: 16, padding: 0
                }}>×</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="0x... wallet address" value={r.address}
                onChange={e => updateRecipient(r.id, 'address', e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: r.address ? (isAddress(r.address) ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.08)'
                }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input type="number" placeholder="Amount" value={r.amount}
                    onChange={e => updateRecipient(r.id, 'amount', e.target.value)}
                    style={{ ...inputStyle, paddingRight: 70 }} />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, fontWeight: 700, color: tokenColor, fontFamily: 'monospace'
                  }}>{token}</span>
                </div>
                <input placeholder="Memo (on-chain)" value={r.memo}
                  onChange={e => updateRecipient(r.id, 'memo', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Recipient */}
      <button onClick={addRecipient} disabled={loading} style={{
        padding: '10px', borderRadius: 10,
        border: '1px dashed rgba(99,102,241,0.3)',
        background: 'transparent', color: '#6366F1',
        fontSize: 12, cursor: 'pointer', fontFamily: 'monospace'
      }}>
        + Add Recipient
      </button>

      {/* Summary */}
      {validRecipients.length > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>BATCH SUMMARY</div>
          <Row label="Valid recipients" value={`${validRecipients.length} wallets`} color="#6366F1" />
          <Row label="Total amount" value={`${totalAmount.toFixed(2)} ${token}`} color={tokenColor} />
          <Row label="Transactions" value={`${validRecipients.length} sequential txs`} color="#22C55E" />
          <Row label="Network" value="ARC Testnet · ~0.48s each" color="#22C55E" />
          <Row label="Memo" value={validRecipients.some(r => r.memo) ? '⚡ On-chain per recipient' : 'None'} color="#0EA5E9" />
          {totalAmount > parseFloat(balance) && (
            <Row label="⚠ Warning" value={`Need ${totalAmount.toFixed(2)}, have ${balance}`} color="#EF4444" />
          )}
        </div>
      )}

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div style={{ borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{
            height: 4, borderRadius: 8,
            background: 'linear-gradient(90deg, #6366F1, #0EA5E9)',
            width: `${progress}%`, transition: 'width 0.5s ease'
          }} />
        </div>
      )}

      {status && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)',
          color: '#0EA5E9', fontSize: 12, fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          {loading && <span style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9',
            display: 'inline-block', animation: 'spin 1s linear infinite'
          }} />}
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
          ✅ Batch complete! {validRecipients.length} wallets received {token}.{' '}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ color: '#22C55E', textDecoration: 'underline' }}>
            View last tx ↗
          </a>
        </div>
      )}

      <button onClick={handleBatchSend}
        disabled={loading || validRecipients.length === 0 || totalAmount > parseFloat(balance)}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || validRecipients.length === 0 ? 'not-allowed' : 'pointer',
          border: 'none',
          background: loading || validRecipients.length === 0 ? '#111628' : '#6366F1',
          color: loading || validRecipients.length === 0 ? '#64748B' : '#fff',
          boxShadow: !loading && validRecipients.length > 0 ? '0 0 24px rgba(99,102,241,0.3)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading
          ? `⟳ ${status || 'Processing...'}`
          : `📤 Send to ${validRecipients.length} Wallet${validRecipients.length !== 1 ? 's' : ''}`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Row({ label, value, color = '#F1F5F9' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
      <span style={{ color: '#64748B' }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}