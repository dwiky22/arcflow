'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, isAddress, toHex, encodeFunctionData } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'
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

interface SavedAddress { name: string; address: string }

export default function SendPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [token, setToken] = useState<'USDC' | 'EURC'>('USDC')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [balance, setBalance] = useState('0.00')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [showAddressBook, setShowAddressBook] = useState(false)
  const [newName, setNewName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)

  const tokenAddress = token === 'USDC' ? CONTRACTS.USDC : CONTRACTS.EURC
  const tokenColor = token === 'USDC' ? '#0EA5E9' : '#818CF8'
  const isValidAddress = recipient && isAddress(recipient)
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arcflow_address_book')
      if (saved) setSavedAddresses(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    if (!publicClient || !address) return
    publicClient.readContract({
      address: tokenAddress, abi: ERC20_ABI,
      functionName: 'balanceOf', args: [address],
    }).then(b => setBalance(parseFloat(formatUnits(b as bigint, 6)).toFixed(2)))
      .catch(() => setBalance('0.00'))
  }, [token, address, publicClient])

  const saveAddress = () => {
    if (!newName || !isValidAddress) return
    const updated = [...savedAddresses, { name: newName, address: recipient }]
    setSavedAddresses(updated)
    localStorage.setItem('arcflow_address_book', JSON.stringify(updated))
    setNewName(''); setShowSaveForm(false)
    toast.show({ type: 'success', title: 'Address saved!', desc: newName })
  }

  const removeAddress = (addr: string) => {
    const updated = savedAddresses.filter(a => a.address !== addr)
    setSavedAddresses(updated)
    localStorage.setItem('arcflow_address_book', JSON.stringify(updated))
  }

  const handleSend = async () => {
    if (!isConnected || !walletClient || !address) { setError('Connect wallet first'); return }
    if (!isValidAddress) { setError('Invalid recipient address'); return }
    if (!isValidAmount) { setError('Invalid amount'); return }

    setError(''); setLoading(true); setTxHash(''); setStatus('')

    try {
      const amountIn = parseUnits(amount, 6)
      setStatus('Sign transaction in your wallet...')

      // Encode transfer calldata
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountIn],
      })

      // Attach memo as hex suffix if provided (Arc v0.7.2 tx memo)
      const memoHex = memo ? toHex(memo) : undefined
      const data = memoHex
        ? `${transferData}${memoHex.slice(2)}` as `0x${string}`
        : transferData

      const hash = await walletClient.sendTransaction({
        to: tokenAddress,
        data,
        value: 0n,
      })

      setStatus(`Sent! Confirming... (${hash.slice(0, 10)}...)`)
      await new Promise(r => setTimeout(r, 6000))

      // Save to history with memo
      const txRecord = {
        hash, type: 'send', amount, token, recipient, memo,
        timestamp: Date.now(),
      }
      try {
        const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
        localStorage.setItem('arcflow_tx_history', JSON.stringify([txRecord, ...history].slice(0, 50)))
      } catch {}

      setTxHash(hash)
      setStatus('')
      setAmount('')
      setMemo('')

      onSuccess?.({ type: 'send', amount, token, recipient, memo, hash })
      toast.show({
        type: 'success',
        title: 'Transfer successful!',
        desc: `${amount} ${token} → ${recipient.slice(0, 6)}...${recipient.slice(-4)}${memo ? ` · "${memo}"` : ''}`,
        link: `https://testnet.arcscan.app/tx/${hash}`,
      })
    } catch (e: any) {
      const errMsg = e.shortMessage || e.message?.slice(0, 100) || 'Send failed'
      setError(errMsg)
      setStatus('')
      toast.show({ type: 'error', title: 'Transfer failed', desc: errMsg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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

      {/* Recipient */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Recipient Address</label>
          <button onClick={() => setShowAddressBook(!showAddressBook)} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
            background: showAddressBook ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: showAddressBook ? '#6366F1' : '#64748B',
            border: '1px solid rgba(99,102,241,0.2)'
          }}>📋 Address Book {savedAddresses.length > 0 ? `(${savedAddresses.length})` : ''}</button>
        </div>

        {showAddressBook && (
          <div style={{ marginBottom: 8, padding: 10, borderRadius: 10, background: '#0a0d18', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {savedAddresses.length === 0 && (
              <p style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', textAlign: 'center', padding: '8px 0' }}>No saved addresses yet</p>
            )}
            {savedAddresses.map(a => (
              <div key={a.address} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 8, background: '#111628',
                border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer'
              }} onClick={() => { setRecipient(a.address); setShowAddressBook(false) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {a.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>{a.address.slice(0, 8)}...{a.address.slice(-6)}</div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); removeAddress(a.address) }}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <input type="text" placeholder="0x..." value={recipient}
          onChange={e => setRecipient(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: recipient ? (isValidAddress ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.08)'
          }} />
        {recipient && !isValidAddress && (
          <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontFamily: 'monospace' }}>Invalid address</p>
        )}
        {isValidAddress && !savedAddresses.find(a => a.address === recipient) && (
          <button onClick={() => setShowSaveForm(!showSaveForm)} style={{
            marginTop: 6, fontSize: 10, padding: '3px 8px', borderRadius: 6,
            background: 'transparent', border: '1px dashed rgba(99,102,241,0.3)',
            color: '#6366F1', cursor: 'pointer'
          }}>+ Save to address book</button>
        )}
        {showSaveForm && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input type="text" placeholder="Name (e.g. My Wallet)" value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ ...inputStyle, padding: '8px 12px', fontSize: 12, flex: 1 }} />
            <button onClick={saveAddress} style={{
              padding: '8px 14px', borderRadius: 8, background: '#6366F1',
              color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600
            }}>Save</button>
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Amount</label>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
            Balance: <span style={{ color: tokenColor }}>{balance} {token}</span>
            <button onClick={() => setAmount(balance)} style={{
              marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: `${tokenColor}15`, color: tokenColor,
              border: `1px solid ${tokenColor}30`, cursor: 'pointer'
            }}>MAX</button>
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <input type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, paddingRight: 90 }} />
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            background: `${tokenColor}15`, color: tokenColor,
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${tokenColor}30`
          }}>{token}</span>
        </div>
      </div>

      {/* Memo Field — Arc v0.7.2 on-chain memo */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>On-chain Memo (optional)</label>
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace',
            background: 'rgba(14,165,233,0.08)', color: '#0EA5E9',
            border: '1px solid rgba(14,165,233,0.2)'
          }}>⚡ ARC v0.7.2</span>
        </div>
        <input type="text" placeholder="Invoice #001, Payment for..., Reference ID..." value={memo}
          onChange={e => setMemo(e.target.value)} maxLength={100}
          style={inputStyle} />
        <p style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 4 }}>
          📌 Attached on-chain · Visible on ArcScan · {memo.length}/100 chars
        </p>
      </div>

      {/* Summary */}
      {isValidAddress && isValidAmount && (
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>TRANSFER SUMMARY</div>
          <Row label="Sending" value={`${amount} ${token}`} color={tokenColor} />
          <Row label="To" value={`${recipient.slice(0, 8)}...${recipient.slice(-6)}`} />
          {memo && <Row label="Memo" value={`"${memo}"`} color="#0EA5E9" />}
          <Row label="Network" value="ARC Testnet · ~0.48s finality" color="#22C55E" />
          <Row label="Gas" value="~$0.01 USDC" color="#64748B" />
        </div>
      )}

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
          ✅ Sent!{' '}
          {memo && <span style={{ color: '#0EA5E9' }}>Memo: "{memo}" · </span>}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ color: '#22C55E', textDecoration: 'underline' }}>
            View on ArcScan ↗
          </a>
        </div>
      )}

      <button onClick={handleSend} disabled={loading || !isValidAddress || !isValidAmount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || !isValidAddress || !isValidAmount ? 'not-allowed' : 'pointer',
          border: 'none',
          background: loading || !isValidAddress || !isValidAmount ? '#111628' : '#22C55E',
          color: loading || !isValidAddress || !isValidAmount ? '#64748B' : '#000',
          boxShadow: !loading && isValidAddress && isValidAmount ? '0 0 24px rgba(34,197,94,0.25)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Processing...'}` : `Send ${amount || '0'} ${token}${memo ? ' + memo' : ''}`}
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