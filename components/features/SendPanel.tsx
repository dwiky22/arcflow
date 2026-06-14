'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'

const TOKENS = [
  { symbol: 'USDC', address: CONTRACTS.USDC, color: '#0EA5E9' },
  { symbol: 'EURC', address: CONTRACTS.EURC, color: '#818CF8' },
]

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: '#111628', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F1F5F9', boxSizing: 'border-box' as const, fontFamily: 'inherit',
}
const labelStyle = {
  fontSize: 11, color: '#64748B', fontFamily: 'monospace',
  letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'block'
}

export default function SendPanel({ onSuccess }: { onSuccess?: (tx: any) => void }) {
  const { address, isConnected } = useAccount()
  const [token, setToken] = useState(TOKENS[0])
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  const { data: balance } = useReadContract({
    address: token.address, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContractAsync } = useWriteContract()
  const isValidAddress = recipient ? isAddress(recipient) : true
  const formattedBalance = balance ? parseFloat(formatUnits(balance as bigint, 6)).toFixed(2) : '0.00'

  const handleSend = async () => {
    if (!isConnected) { setError('Connect wallet first'); return }
    if (!recipient || !isAddress(recipient)) { setError('Enter a valid address'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
    if (balance && parseUnits(amount, 6) > (balance as bigint)) { setError('Insufficient balance'); return }
    setError(''); setLoading(true)
    try {
      const tx = await writeContractAsync({
        address: token.address, abi: ERC20_ABI, functionName: 'transfer',
        args: [recipient as `0x${string}`, parseUnits(amount, 6)],
      })
      setTxHash(tx)
      onSuccess?.({ type: 'send', amount, token: token.symbol, recipient, hash: tx })
      setAmount(''); setRecipient('')
    } catch (e: any) {
      setError(e.shortMessage || e.message || 'Send failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Token Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {TOKENS.map(t => (
          <button key={t.symbol} onClick={() => setToken(t)} style={{
            padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', border: 'none',
            background: token.symbol === t.symbol ? `${t.color}15` : '#111628',
            color: token.symbol === t.symbol ? t.color : '#64748B',
            outline: token.symbol === t.symbol ? `1px solid ${t.color}50` : '1px solid rgba(255,255,255,0.06)'
          }}>{t.symbol}</button>
        ))}
      </div>

      {/* Recipient */}
      <div>
        <label style={labelStyle}>Recipient Address</label>
        <input
          type="text" placeholder="0x..." value={recipient}
          onChange={e => setRecipient(e.target.value)}
          style={{
            ...inputStyle, fontFamily: 'monospace', fontSize: 13,
            border: `1px solid ${!isValidAddress ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`
          }}
        />
        {!isValidAddress && (
          <p style={{ color: '#EF4444', fontSize: 11, marginTop: 6, fontFamily: 'monospace' }}>
            Invalid address format
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
              Balance: <span style={{ color: token.color }}>{formattedBalance} {token.symbol}</span>
            </span>
            <button onClick={() => balance && setAmount(formatUnits(balance as bigint, 6))}
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(14,165,233,0.1)', color: '#0EA5E9',
                border: '1px solid rgba(14,165,233,0.2)', fontWeight: 700, fontFamily: 'monospace'
              }}>MAX</button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, paddingRight: 90 }} />
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            background: `${token.color}15`, color: token.color,
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${token.color}30`
          }}>{token.symbol}</span>
        </div>
      </div>

      {/* Summary */}
      {amount && recipient && isAddress(recipient) && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, background: '#111628',
          border: '1px solid rgba(255,255,255,0.06)', display: 'flex',
          flexDirection: 'column', gap: 8
        }}>
          {[
            { label: 'To', value: `${recipient.slice(0,8)}...${recipient.slice(-6)}`, color: '#F1F5F9' },
            { label: 'Amount', value: `${amount} ${token.symbol}`, color: token.color },
            { label: 'Network', value: 'ARC Testnet', color: '#22C55E' },
            { label: 'Gas', value: '~$0.01 USDC', color: '#64748B' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{row.label}</span>
              <span style={{ fontSize: 12, color: row.color, fontFamily: 'monospace', fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13 }}>
          {error}
        </div>
      )}
      {txHash && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          ✓ Sent! Tx: {txHash.slice(0, 24)}...
        </div>
      )}

      <button onClick={handleSend} disabled={loading || !amount || !recipient}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: loading || !amount || !recipient ? 'not-allowed' : 'pointer', border: 'none',
          background: loading || !amount || !recipient ? '#111628' : '#22C55E',
          color: loading || !amount || !recipient ? '#64748B' : '#000',
          boxShadow: !loading && amount && recipient ? '0 0 24px rgba(34,197,94,0.3)' : 'none',
          transition: 'all 0.2s'
        }}>
        {loading ? '⟳ Sending...' : `Send ${token.symbol}`}
      </button>
    </div>
  )
}