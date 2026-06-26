'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { ERC20_ABI } from '@/lib/contracts'
import { useToast } from '@/components/ui/Toast'
import { TokenLogo, TokenSelectorModal, ARC_TOKENS } from '@/lib/tokens'

interface Recipient { id: string; address: string; amount: string; memo: string }

export default function BatchSendPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [token, setToken] = useState(ARC_TOKENS[0])
  const [showTokenModal, setShowTokenModal] = useState(false)
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

  const validRecipients = recipients.filter(r => r.address && isAddress(r.address) && r.amount && parseFloat(r.amount) > 0)
  const totalAmount = validRecipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0)

  useEffect(() => {
    if (!publicClient || !address) return
    publicClient.readContract({
      address: token.address as `0x${string}`, abi: ERC20_ABI,
      functionName: 'balanceOf', args: [address],
    }).then(b => setBalance(parseFloat(formatUnits(b as bigint, token.decimals)).toFixed(4)))
      .catch(() => setBalance('0.00'))
  }, [token, address, publicClient])

  const addRecipient = () => setRecipients(p => [...p, { id: Date.now().toString(), address: '', amount: '', memo: '' }])
  const removeRecipient = (id: string) => { if (recipients.length > 1) setRecipients(p => p.filter(r => r.id !== id)) }
  const updateRecipient = (id: string, field: keyof Recipient, value: string) =>
    setRecipients(p => p.map(r => r.id === id ? { ...r, [field]: value } : r))

  const handleBatchSend = async () => {
    if (!isConnected || !walletClient || !address) { setError('Connect wallet first'); return }
    if (validRecipients.length === 0) { setError('Add at least one valid recipient'); return }
    if (totalAmount > parseFloat(balance)) { setError(`Insufficient balance. Need ${totalAmount.toFixed(4)} ${token.symbol}`); return }

    setError(''); setLoading(true); setTxHash(''); setStatus(''); setProgress(0)
    const hashes: string[] = []

    try {
      for (let i = 0; i < validRecipients.length; i++) {
        const r = validRecipients[i]
        setStatus(`Sending to wallet ${i + 1}/${validRecipients.length}...`)
        setProgress(Math.round((i / validRecipients.length) * 100))

        const hash = await walletClient.writeContract({
          address: token.address as `0x${string}`,
          abi: ERC20_ABI, functionName: 'transfer',
          args: [r.address as `0x${string}`, parseUnits(r.amount, token.decimals)],
        })
        hashes.push(hash)
        setStatus(`✅ Wallet ${i + 1} done! ${i < validRecipients.length - 1 ? 'Waiting...' : ''}`)
        if (i < validRecipients.length - 1) await new Promise(r => setTimeout(r, 3000))
      }

      setProgress(100)
      setStatus('All sent! Confirming...')
      await new Promise(r => setTimeout(r, 5000))

      const lastHash = hashes[hashes.length - 1]

      try {
        const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
        localStorage.setItem('arcflow_tx_history', JSON.stringify([
          { hash: lastHash, type: 'send', amount: totalAmount.toFixed(4), token: token.symbol, recipient: `${validRecipients.length} wallets`, memo: 'Batch', timestamp: Date.now() },
          ...history
        ].slice(0, 50)))
      } catch {}

      setTxHash(lastHash)
      setStatus('')
      setProgress(0)
      onSuccess?.({ type: 'send', amount: totalAmount.toFixed(4), token: token.symbol, hash: lastHash })
      toast.show({
        type: 'success', title: 'Batch send complete!',
        desc: `${totalAmount.toFixed(4)} ${token.symbol} → ${validRecipients.length} wallets`,
        link: `https://testnet.arcscan.app/tx/${lastHash}`,
      })
      setRecipients([
        { id: '1', address: '', amount: '', memo: '' },
        { id: '2', address: '', amount: '', memo: '' },
      ])
    } catch (e: any) {
      const errMsg = e.shortMessage || e.message?.slice(0, 100) || 'Failed'
      setError(`Failed at wallet ${hashes.length + 1}: ${errMsg}`)
      setStatus('')
      setProgress(0)
      if (hashes.length > 0) toast.show({ type: 'info', title: `${hashes.length}/${validRecipients.length} sent`, desc: 'Partial success before error' })
      else toast.show({ type: 'error', title: 'Batch failed', desc: errMsg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 14,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)'
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#818CF8' }}>⚡ Batch Send</div>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
            Send to multiple wallets · Sequential transactions
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>Balance</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: token.color, fontFamily: 'monospace' }}>{balance} {token.symbol}</div>
        </div>
      </div>

      {/* Token selector */}
      <div>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Token to Send</div>
        <button onClick={() => setShowTokenModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12, cursor: 'pointer', width: '100%',
          background: token.bg, border: `1px solid ${token.color}30`,
          transition: 'all 0.15s', textAlign: 'left'
        }}>
          <TokenLogo symbol={token.symbol} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>{token.symbol}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{token.name}</div>
          </div>
          <span style={{ fontSize: 12, color: '#64748B' }}>▼ Change</span>
        </button>
      </div>

      {/* Recipients */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recipients</div>
        {recipients.map((r, i) => (
          <div key={r.id} style={{ padding: 14, borderRadius: 14, background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <span style={{ fontSize: 12, color: '#818CF8', fontFamily: 'monospace', fontWeight: 600 }}>Recipient #{i + 1}</span>
                {r.address && isAddress(r.address) && r.amount && (
                  <span style={{ fontSize: 10, color: '#22C55E', fontFamily: 'monospace' }}>✓</span>
                )}
              </div>
              {recipients.length > 1 && (
                <button onClick={() => removeRecipient(r.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18 }}>×</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="0x... wallet address" value={r.address}
                onChange={e => updateRecipient(r.id, 'address', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                  background: '#111628', border: `1px solid ${r.address ? (isAddress(r.address) ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.07)'}`,
                  color: '#F1F5F9', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'monospace'
                }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input type="number" placeholder="Amount" value={r.amount}
                    onChange={e => updateRecipient(r.id, 'amount', e.target.value)}
                    style={{ width: '100%', padding: '10px 60px 10px 12px', borderRadius: 10, fontSize: 13, background: '#111628', border: '1px solid rgba(255,255,255,0.07)', color: '#F1F5F9', outline: 'none', boxSizing: 'border-box' as const }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: token.color, fontFamily: 'monospace' }}>{token.symbol}</span>
                </div>
                <input placeholder="Note (optional)" value={r.memo}
                  onChange={e => updateRecipient(r.id, 'memo', e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 12, background: '#111628', border: '1px solid rgba(255,255,255,0.07)', color: '#F1F5F9', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRecipient} disabled={loading} style={{
        padding: '10px', borderRadius: 10, border: '1px dashed rgba(99,102,241,0.3)',
        background: 'transparent', color: '#818CF8', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace'
      }}>+ Add Recipient</button>

      {/* Summary */}
      {validRecipients.length > 0 && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>BATCH SUMMARY</div>
          <Row label="Valid recipients" value={`${validRecipients.length} wallets`} color="#818CF8" />
          <Row label="Total amount" value={`${totalAmount.toFixed(4)} ${token.symbol}`} color={token.color} />
          <Row label="Transactions" value={`${validRecipients.length} sequential`} color="#22C55E" />
          {totalAmount > parseFloat(balance) && <Row label="⚠ Warning" value="Insufficient balance!" color="#EF4444" />}
        </div>
      )}

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div style={{ borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', height: 4 }}>
          <div style={{ height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #6366F1, #818CF8)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
        </div>
      )}

      {status && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', color: '#818CF8', fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#818CF8', display: 'inline-block', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
          {status}
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>❌ {error}</div>}

      {txHash && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Batch complete! <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', textDecoration: 'underline' }}>View last tx ↗</a>
        </div>
      )}

      <button onClick={handleBatchSend}
        disabled={loading || validRecipients.length === 0 || totalAmount > parseFloat(balance)}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: loading || validRecipients.length === 0 ? 'not-allowed' : 'pointer',
          border: 'none',
          background: loading || validRecipients.length === 0 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #6366F1, #818CF8)',
          color: loading || validRecipients.length === 0 ? '#475569' : '#fff',
          boxShadow: !loading && validRecipients.length > 0 ? '0 0 24px rgba(99,102,241,0.2)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Processing...'}` : `📤 Send to ${validRecipients.length} Wallet${validRecipients.length !== 1 ? 's' : ''}`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showTokenModal && (
        <TokenSelectorModal
          onSelect={t => { setToken(t); }}
          onClose={() => setShowTokenModal(false)}
        />
      )}
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