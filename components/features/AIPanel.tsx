'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256, isAddress } from 'viem'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI, SIMPLE_AMM_ABI } from '@/lib/contracts'

interface Action {
  type: 'bridge' | 'swap' | 'send'
  amount?: string
  token?: string
  fromToken?: string
  toToken?: string
  recipient?: string
  fromChain?: string
  toChain?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: Action
  actionStatus?: 'idle' | 'running' | 'done' | 'error'
}

const SUGGESTIONS = [
  'Swap 5 USDC to EURC',
  'Send 2 USDC to 0x3cB55222160655ceb2bF5De0A898f6BA4e1A2ba9',
  'Bridge 10 USDC from Sepolia to ARC',
  'What can you help me with?',
]

export default function AIPanel({ onAction }: { onAction?: (action: any) => void }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: '👋 Hi! I\'m your ArcFlow AI Agent. Tell me what you want — swap, send, or bridge — and I\'ll prepare it for you to confirm.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const updateMsg = (id: string, patch: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  const handleSend = async (text?: string) => {
    const userInput = text || input
    if (!userInput.trim() || loading) return

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userInput }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, address: address || null }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        action: data.action,
        actionStatus: data.action ? 'idle' : undefined,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Something went wrong. Please try again.',
      }])
    } finally { setLoading(false) }
  }

  // ===== Execute Swap =====
  const executeSwap = async (msgId: string, action: Action) => {
    if (!walletClient || !publicClient || !address) {
      updateMsg(msgId, { actionStatus: 'error', content: '❌ Connect wallet first' }); return
    }
    const fromToken = (action.fromToken || 'USDC').toUpperCase()
    const direction: 'AtoB' | 'BtoA' = fromToken === 'USDC' ? 'AtoB' : 'BtoA'
    const tokenAddress = direction === 'AtoB' ? CONTRACTS.USDC : CONTRACTS.EURC
    const amountIn = parseUnits(action.amount || '0', 6)

    updateMsg(msgId, { actionStatus: 'running' })
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress, abi: ERC20_ABI, functionName: 'allowance',
        args: [address, CONTRACTS.SIMPLE_AMM],
      }) as bigint

      if (allowance < amountIn) {
        await walletClient.writeContract({
          address: tokenAddress, abi: ERC20_ABI, functionName: 'approve',
          args: [CONTRACTS.SIMPLE_AMM, maxUint256],
        })
        await new Promise(r => setTimeout(r, 10000))
      }

      const swapFn = direction === 'AtoB' ? 'swapAForB' : 'swapBForA'
      const hash = await walletClient.writeContract({
        address: CONTRACTS.SIMPLE_AMM, abi: SIMPLE_AMM_ABI, functionName: swapFn,
        args: [amountIn],
      })
      await new Promise(r => setTimeout(r, 8000))

      updateMsg(msgId, { actionStatus: 'done' })
      onAction?.({ type: 'swap', amount: action.amount, fromToken, toToken: direction === 'AtoB' ? 'EURC' : 'USDC', hash })
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `✅ Swap done! ${action.amount} ${fromToken} → ${direction === 'AtoB' ? 'EURC' : 'USDC'}. [View on ArcScan](https://testnet.arcscan.app/tx/${hash})`
      }])
    } catch (e: any) {
      updateMsg(msgId, { actionStatus: 'error' })
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `❌ Swap failed: ${e.shortMessage || e.message?.slice(0, 100)}`
      }])
    }
  }

  // ===== Execute Send =====
  const executeSend = async (msgId: string, action: Action) => {
    if (!walletClient || !address) {
      updateMsg(msgId, { actionStatus: 'error', content: '❌ Connect wallet first' }); return
    }
    if (!action.recipient || !isAddress(action.recipient)) {
      updateMsg(msgId, { actionStatus: 'error' })
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '❌ Invalid recipient address' }])
      return
    }
    const token = (action.token || 'USDC').toUpperCase()
    const tokenAddress = token === 'EURC' ? CONTRACTS.EURC : CONTRACTS.USDC
    const amount = parseUnits(action.amount || '0', 6)

    updateMsg(msgId, { actionStatus: 'running' })
    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress, abi: ERC20_ABI, functionName: 'transfer',
        args: [action.recipient as `0x${string}`, amount],
      })
      await new Promise(r => setTimeout(r, 6000))

      updateMsg(msgId, { actionStatus: 'done' })
      onAction?.({ type: 'send', amount: action.amount, token, recipient: action.recipient, hash })
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `✅ Sent ${action.amount} ${token} to ${action.recipient.slice(0,6)}...${action.recipient.slice(-4)}. [View on ArcScan](https://testnet.arcscan.app/tx/${hash})`
      }])
    } catch (e: any) {
      updateMsg(msgId, { actionStatus: 'error' })
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `❌ Send failed: ${e.shortMessage || e.message?.slice(0, 100)}`
      }])
    }
  }

  const handleExecute = (msgId: string, action: Action) => {
    if (!isConnected) {
      updateMsg(msgId, { actionStatus: 'error' })
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '❌ Please connect your wallet first' }])
      return
    }
    if (action.type === 'swap') executeSwap(msgId, action)
    else if (action.type === 'send') executeSend(msgId, action)
    else if (action.type === 'bridge') onAction?.(action) // bridge: switch tab, too complex for inline
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12, background: '#111628',
        border: '1px solid rgba(99,102,241,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>ArcFlow AI Agent</div>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>Groq · llama-3.3-70b-versatile</div>
          </div>
        </div>
        <div style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 20, fontFamily: 'monospace',
          background: 'rgba(34,197,94,0.08)', color: '#22C55E',
          border: '1px solid rgba(34,197,94,0.2)'
        }}>● Online</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320, maxHeight: 440, padding: '4px 2px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>⚡</div>
            )}
            <div style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: 14, fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'user' ? 'rgba(14,165,233,0.12)' : '#111628',
              border: msg.role === 'user' ? '1px solid rgba(14,165,233,0.25)' : '1px solid rgba(255,255,255,0.06)',
              color: '#F1F5F9',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 14,
            }}>
              {msg.content}

              {/* Action Card */}
              {msg.action && (
                <div style={{
                  marginTop: 12, padding: 14, borderRadius: 12,
                  background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)'
                }}>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366F1', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                    {msg.action.type === 'swap' ? '🔄 Swap Action' : msg.action.type === 'send' ? '📤 Send Action' : '🌉 Bridge Action'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {msg.action.type === 'swap' && (
                      <>
                        <Row label="Amount" value={`${msg.action.amount} ${(msg.action.fromToken || 'USDC').toUpperCase()}`} />
                        <Row label="To" value={(msg.action.toToken || (msg.action.fromToken === 'EURC' ? 'USDC' : 'EURC')).toUpperCase()} color="#818CF8" />
                        <Row label="Via" value="SimpleAMM · 0.3% fee" color="#64748B" />
                      </>
                    )}
                    {msg.action.type === 'send' && (
                      <>
                        <Row label="Amount" value={`${msg.action.amount} ${(msg.action.token || 'USDC').toUpperCase()}`} />
                        <Row label="To" value={msg.action.recipient ? `${msg.action.recipient.slice(0,8)}...${msg.action.recipient.slice(-6)}` : '—'} color="#22C55E" />
                      </>
                    )}
                    {msg.action.type === 'bridge' && (
                      <>
                        <Row label="Amount" value={`${msg.action.amount} ${(msg.action.token || 'USDC').toUpperCase()}`} />
                        <Row label="Route" value={`${msg.action.fromChain || '?'} → ${msg.action.toChain || 'ARC'}`} color="#0EA5E9" />
                        <Row label="Note" value="Switching to Bridge tab..." color="#64748B" />
                      </>
                    )}
                  </div>

                  {msg.actionStatus === 'idle' && (
                    <button onClick={() => handleExecute(msg.id, msg.action!)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                        background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}>
                      {msg.action.type === 'bridge' ? 'Open Bridge Tab' : `Confirm & Execute`}
                    </button>
                  )}
                  {msg.actionStatus === 'running' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 10, fontSize: 12, color: '#0EA5E9', fontFamily: 'monospace' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(14,165,233,0.3)', borderTopColor: '#0EA5E9', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Processing... confirm in wallet
                    </div>
                  )}
                  {msg.actionStatus === 'done' && (
                    <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: '#22C55E', fontFamily: 'monospace' }}>✅ Completed</div>
                  )}
                  {msg.actionStatus === 'error' && (
                    <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: '#EF4444', fontFamily: 'monospace' }}>❌ Failed — try again</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <div style={{ padding: '12px 16px', borderRadius: 14, borderBottomLeftRadius: 4, background: '#111628', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 150, 300].map(delay => (
                <div key={delay} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: `bounce 1s ${delay}ms infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSend(s)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: '#111628', border: '1px solid rgba(255,255,255,0.06)',
              color: '#94A3B8', textAlign: 'left'
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          placeholder="Type a command... e.g. Swap 5 USDC to EURC"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 12, fontSize: 13,
            outline: 'none', background: '#111628',
            border: '1px solid rgba(99,102,241,0.25)', color: '#F1F5F9',
          }}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          style={{
            padding: '14px 20px', borderRadius: 12, fontSize: 16, fontWeight: 700,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', border: 'none',
            background: loading || !input.trim() ? '#111628' : '#6366F1',
            color: loading || !input.trim() ? '#64748B' : '#fff', minWidth: 52
          }}>
          {loading ? '⟳' : '↑'}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
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