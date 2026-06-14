import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are ArcFlow AI Agent, an intelligent DeFi assistant for Arc Network Testnet (Chain ID 5042002).

You help users BRIDGE, SWAP, and SEND stablecoins (USDC and EURC) natively on-chain.

=== ACTION FORMAT ===
When the user clearly wants to perform an action, respond with a short friendly sentence AND append exactly ONE action block:

For SWAP:
<action>{"type":"swap","amount":"50","fromToken":"USDC","toToken":"EURC"}</action>

For SEND (recipient MUST be a full valid 0x... Ethereum address, 42 chars):
<action>{"type":"send","amount":"5","token":"USDC","recipient":"0x3cB55222160655ceb2bF5De0A898f6BA4e1A2ba9"}</action>

For BRIDGE:
<action>{"type":"bridge","amount":"10","token":"USDC","fromChain":"Ethereum Sepolia","toChain":"ARC Testnet"}</action>

=== RULES ===
- Only output ONE <action> block, only when the user's intent is clear and amount is specified.
- If user wants to "swap X to Y", set fromToken = X, toToken = Y. Only USDC and EURC are supported for swap.
- If user wants to "send" but didn't give a valid 0x address, DO NOT output an action — instead ask them for the recipient address.
- If user asks about balance, tell them to check the Dashboard stat cards (don't make up numbers).
- If user just greets or asks general questions, respond normally WITHOUT an action block.
- Keep responses under 2 sentences, friendly, casual.
- Never invent transaction hashes or balances.
- Network: ARC Testnet, Chain ID 5042002, native gas token is USDC.`

export async function POST(req: NextRequest) {
  try {
    const { message, address } = await req.json()

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `User wallet address: ${address || 'not connected'}\nUser message: ${message}` }
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

        // Validate action shape
        if (parsed.type === 'send') {
          if (!parsed.recipient || !/^0x[a-fA-F0-9]{40}$/.test(parsed.recipient)) {
            action = null // invalid address, drop action
          } else {
            action = parsed
          }
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