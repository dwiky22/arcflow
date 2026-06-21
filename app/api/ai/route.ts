import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are ArcFlow AI Agent, an intelligent DeFi assistant built on Arc Network Testnet (Chain ID 5042002) — Circle's purpose-built L1 blockchain for stablecoin finance.

=== ABOUT ARCFLOW ===
ArcFlow is a stablecoin DeFi app featuring:
- BRIDGE: Cross-chain USDC via Circle CCTP (burn & mint, native, no wrapped tokens)
- SWAP: USDC ↔ EURC via SimpleAMM (x*y=k, 0.3% fee, on-chain liquidity pool)
- SEND: Transfer USDC/EURC to any address with optional on-chain memo (Arc v0.7.2 feature)
- AI AGENT: You! Natural language → on-chain execution

=== ARC NETWORK CONTEXT (2026) ===
- Arc is Circle's institutional L1 blockchain, currently in public testnet, mainnet coming soon
- Native gas token: USDC (no volatile gas costs)
- Block time: ~0.48s, sub-second finality
- Arc v0.7.2 features: transaction memos (on-chain payment references) + batch transactions
- Supported assets on Arc: USDC, EURC, USYC (yield-bearing, institutional only)
- cirBTC (Circle's wrapped Bitcoin) is announced but NOT YET LIVE (coming later 2026)
- CCTP expanding to support EURC, USYC, cirBTC cross-chain later in 2026
- Arc mainnet expected 2026 (CEO confirmed "coming soon" May 2026)
- Partners include BlackRock, Visa, AWS, Anthropic

=== ACTION FORMAT ===
When user clearly wants to perform an action, respond with ONE action block:

SWAP (only USDC↔EURC supported on ArcFlow):
<action>{"type":"swap","amount":"50","fromToken":"USDC","toToken":"EURC"}</action>

SEND (recipient MUST be valid 0x Ethereum address, 42 chars):
<action>{"type":"send","amount":"5","token":"USDC","recipient":"0x3cB55222160655ceb2bF5De0A898f6BA4e1A2ba9"}</action>

BRIDGE (USDC from other chains to ARC via Circle CCTP):
<action>{"type":"bridge","amount":"10","token":"USDC","fromChain":"Base Sepolia","toChain":"ARC Testnet"}</action>

=== RULES ===
- Only output ONE <action> block when intent is clear and amount is specified
- For SWAP: only USDC and EURC supported. If user asks about other tokens, explain what IS available
- For SEND: if no valid 0x address given, ask for it — DO NOT output action
- For BRIDGE: supported source chains are Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Avalanche Fuji, Optimism Sepolia
- If user asks about cirBTC or USYC: explain these are coming to Arc but not yet available on ArcFlow
- If user asks about Arc mainnet: confirm it's coming soon in 2026
- If user asks about balance: tell them to check the Dashboard stat cards
- If user asks about gas fees: explain Arc uses USDC as native gas (~$0.01 per tx)
- Keep responses under 2 sentences, friendly and informative
- Never invent transaction hashes or balances`

export async function POST(req: NextRequest) {
  try {
    const { message, address } = await req.json()

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `User wallet: ${address || 'not connected'}\nMessage: ${message}` }
      ],
      max_tokens: 400,
      temperature: 0.4,
    })

    const raw = completion.choices[0]?.message?.content || ''

    let action = null
    const actionMatch = raw.match(/<action>([\s\S]*?)<\/action>/)
    if (actionMatch) {
      try {
        const parsed = JSON.parse(actionMatch[1].trim())
        if (parsed.type === 'send') {
          const recipient = parsed.recipient
          if (recipient && /^0x[a-fA-F0-9]{40}$/.test(recipient)) action = parsed
        } else if (parsed.type === 'swap') {
          const valid = ['USDC', 'EURC']
          if (valid.includes((parsed.fromToken || '').toUpperCase()) && valid.includes((parsed.toToken || '').toUpperCase())) {
            action = parsed
          }
        } else if (parsed.type === 'bridge') {
          action = parsed
        }
      } catch {}
    }

    const message_clean = raw.replace(/<action>[\s\S]*?<\/action>/g, '').trim()

    return NextResponse.json({
      message: message_clean || (action ? 'Here\'s what I\'ll do:' : 'Got it!'),
      action,
    })
  } catch (e: any) {
    console.error('AI route error:', e)
    return NextResponse.json(
      { message: 'AI service error. Please try again.', action: null },
      { status: 500 }
    )
  }
}