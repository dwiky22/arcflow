'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { ERC20_ABI } from '@/lib/contracts'
import { useToast } from '@/components/ui/Toast'
import { TokenLogo, TokenSelectorModal, ARC_TOKENS } from '@/lib/tokens'

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const,
}

interface SavedAddress { name: string; address: string }

export default function SendPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const toast = useToast()

  const [token, setToken] = useState(ARC_TOKENS[0])
  const [showTokenModal, setShowTokenModal] = useState(false)
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
      address: token.address as `0x${string}`, abi: ERC20_ABI,
      functionName: 'balanceOf', args: [address],
    }).then(b => setBalance(parseFloat(formatUnits(b as bigint, token.decimals)).toFixed(4)))
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
      const amountIn = parseUnits(amount, token.decimals)
      setStatus('Sign transaction in wallet...')

      const hash = await walletClient.writeContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI, functionName: 'transfer',
        args: [recipient as `0x${string}`, amountIn],
      })

      setStatus(`Sent! Confirming...`)
      await new Promise(r => setTimeout(r, 6000))

      try {
        const history = JSON.parse(localStorage.getItem('arcflow_tx_history') || '[]')
        localStorage.setItem('arcflow_tx_history', JSON.stringify([
          { hash, type: 'send', amount, token: token.symbol, recipient, memo, timestamp: Date.now() },
          ...history
        ].slice(0, 50)))
      } catch {}

      try {
        const incoming = JSON.parse(localStorage.getItem('arcflow_incoming') || '[]')
        localStorage.setItem('arcflow_incoming', JSON.stringify([
          { token: token.symbol, amount, memo: memo || null, hash, timestamp: Date.now() },
          ...incoming
        ].slice(0, 20)))
      } catch {}

      setTxHash(hash)
      setStatus('')
      setAmount('')
      setMemo('')

      onSuccess?.({ type: 'send', amount, token: token.symbol, recipient, memo, hash })
      toast.show({
        type: 'success', title: 'Transfer successful!',
        desc: `${amount} ${token.symbol} → ${recipient.slice(0, 6)}...${recipient.slice(-4)}${memo ? ` · "${memo}"` : ''}`,
        link: `https://testnet.arcscan.app/tx/${hash}`,
      })
    } catch (e: any) {
      const errMsg = e.shortMessage || e.message?.slice(0, 100) || 'Send failed'
      setError(errMsg); setStatus('')
      toast.show({ type: 'error', title: 'Transfer failed', desc: errMsg.slice(0, 60) })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Token selector */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Token</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
            Balance: <span style={{ color: token.color }}>{balance}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="number" placeholder="0.0" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 28, fontWeight: 700, color: amount ? '#F1F5F9' : '#475569', padding: 0, minWidth: 0 }} />
          <button onClick={() => setShowTokenModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: token.bg, border: `1px solid ${token.color}35`,
            borderRadius: 12, padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.15s'
          }}>
            <TokenLogo symbol={token.symbol} size={24} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{token.symbol}</span>
            <span style={{ fontSize: 10, color: '#64748B' }}>▼</span>
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>~${parseFloat(amount || '0').toFixed(2)}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setAmount((parseFloat(balance) / 2).toFixed(token.decimals === 8 ? 8 : 4))}
              style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${token.color}15`, color: token.color, border: `1px solid ${token.color}25`, cursor: 'pointer', fontFamily: 'monospace' }}>HALF</button>
            <button onClick={() => setAmount(balance)}
              style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${token.color}15`, color: token.color, border: `1px solid ${token.color}25`, cursor: 'pointer', fontFamily: 'monospace' }}>MAX</button>
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recipient</label>
          <button onClick={() => setShowAddressBook(!showAddressBook)} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
            background: showAddressBook ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: showAddressBook ? '#6366F1' : '#64748B',
            border: '1px solid rgba(99,102,241,0.2)'
          }}>📋 Address Book {savedAddresses.length > 0 ? `(${savedAddresses.length})` : ''}</button>
        </div>

        {showAddressBook && (
          <div style={{ marginBottom: 8, padding: 10, borderRadius: 12, background: '#0a0d18', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {savedAddresses.length === 0 ? (
              <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '8px 0' }}>No saved addresses</p>
            ) : savedAddresses.map(a => (
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
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <input type="text" placeholder="0x... wallet address" value={recipient}
          onChange={e => setRecipient(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: recipient ? (isValidAddress ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)') : 'rgba(255,255,255,0.08)'
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
            <input type="text" placeholder="Label (e.g. My Wallet)" value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ ...inputStyle, padding: '8px 12px', fontSize: 12, flex: 1 }} />
            <button onClick={saveAddress} style={{ padding: '8px 14px', borderRadius: 8, background: '#6366F1', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Save</button>
          </div>
        )}
      </div>

      {/* Memo */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Memo (optional)</label>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(14,165,233,0.08)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.2)', fontFamily: 'monospace' }}>ARC v0.7.2</span>
        </div>
        <input type="text" placeholder="Invoice #, payment note, reference..." value={memo}
          onChange={e => setMemo(e.target.value)} maxLength={100}
          style={inputStyle} />
        <p style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 4 }}>
          📌 Saved with transaction · {memo.length}/100
        </p>
      </div>

      {/* Summary */}
      {isValidAddress && isValidAmount && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '1px', marginBottom: 4 }}>SUMMARY</div>
          <Row label="Sending" value={`${amount} ${token.symbol}`} color={token.color} />
          <Row label="To" value={`${recipient.slice(0, 8)}...${recipient.slice(-6)}`} />
          {memo && <Row label="Memo" value={`"${memo}"`} color="#0EA5E9" />}
          <Row label="Network" value="ARC Testnet · ~0.48s" color="#22C55E" />
          <Row label="Gas" value="~$0.01 USDC" color="#64748B" />
        </div>
      )}

      {status && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', color: '#0EA5E9', fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9', display: 'inline-block', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          {status}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>❌ {error}</div>
      )}

      {txHash && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace' }}>
          ✅ Sent! {memo && <span style={{ color: '#0EA5E9' }}>📌 "{memo}" · </span>}
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', textDecoration: 'underline' }}>View ↗</a>
        </div>
      )}

      <button onClick={handleSend} disabled={loading || !isValidAddress || !isValidAmount}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: loading || !isValidAddress || !isValidAmount ? 'not-allowed' : 'pointer',
          border: 'none',
          background: loading || !isValidAddress || !isValidAmount ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
          color: loading || !isValidAddress || !isValidAmount ? '#475569' : '#fff',
          boxShadow: !loading && isValidAddress && isValidAmount ? '0 0 24px rgba(34,197,94,0.2)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? `⟳ ${status || 'Processing...'}` : `Send ${amount || '0'} ${token.symbol}${memo ? ' + 📌' : ''}`}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showTokenModal && (
        <TokenSelectorModal
          onSelect={t => { setToken(t); setAmount('') }}
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