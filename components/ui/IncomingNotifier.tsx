'use client'

import { useEffect, useRef } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits, hexToString } from 'viem'
import { useToast } from './Toast'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/contracts'

export default function IncomingNotifier() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const toast = useToast()
  const lastBalances = useRef<{ usdc: bigint; eurc: bigint } | null>(null)
  const initialized = useRef(false)
  const processedTxs = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isConnected || !address || !publicClient) return

    const check = async () => {
      try {
        const [usdc, eurc] = await Promise.all([
          publicClient.readContract({ address: CONTRACTS.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
          publicClient.readContract({ address: CONTRACTS.EURC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
        ])

        if (!initialized.current) {
          lastBalances.current = { usdc, eurc }
          initialized.current = true
          return
        }

        const prev = lastBalances.current!

        if (usdc > prev.usdc) {
          const diff = usdc - prev.usdc
          const amount = parseFloat(formatUnits(diff, 6)).toFixed(2)
          const { memo, hash, from } = await findIncomingTx(address as `0x${string}`, CONTRACTS.USDC)
          saveAndNotify('USDC', amount, memo, hash, from)
        }

        if (eurc > prev.eurc) {
          const diff = eurc - prev.eurc
          const amount = parseFloat(formatUnits(diff, 6)).toFixed(2)
          const { memo, hash, from } = await findIncomingTx(address as `0x${string}`, CONTRACTS.EURC)
          saveAndNotify('EURC', amount, memo, hash, from)
        }

        lastBalances.current = { usdc, eurc }
      } catch {}
    }

    // Find incoming tx and decode memo from input data
    const findIncomingTx = async (
      recipient: `0x${string}`,
      tokenAddress: `0x${string}`
    ): Promise<{ memo: string | null; hash: string | null; from: string | null }> => {
      try {
        const block = await publicClient.getBlockNumber()

        // Get Transfer logs to recipient
        const logs = await publicClient.getLogs({
          address: tokenAddress,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', name: 'from', indexed: true },
              { type: 'address', name: 'to', indexed: true },
              { type: 'uint256', name: 'value', indexed: false },
            ],
          },
          args: { to: recipient },
          fromBlock: block - 20n,
          toBlock: block,
        })

        if (!logs.length) return { memo: null, hash: null, from: null }

        // Get latest unprocessed tx
        const latest = logs.filter(l =>
          l.transactionHash && !processedTxs.current.has(l.transactionHash!)
        ).pop()

        if (!latest?.transactionHash) return { memo: null, hash: null, from: null }

        const txHash = latest.transactionHash
        processedTxs.current.add(txHash)

        const from = (latest.args as any)?.from || null

        // Fetch tx to decode input data
        try {
          const tx = await publicClient.getTransaction({ hash: txHash })
          if (!tx?.input || tx.input === '0x' || tx.input.length <= 10) {
            return { memo: null, hash: txHash, from }
          }

          // Standard ERC20 transfer selector = 0xa9059cbb (10 chars: 0x + 8)
          // If input is longer, extra bytes might be memo
          const standardLen = 10 + 64 + 64 // 0x + selector + address + amount
          if (tx.input.length > standardLen) {
            try {
              const extraHex = tx.input.slice(standardLen)
              if (extraHex.length > 0) {
                const memoStr = hexToString(`0x${extraHex}` as `0x${string}`)
                  .replace(/\0/g, '').trim()
                if (memoStr.length > 0 && memoStr.length < 200) {
                  return { memo: memoStr, hash: txHash, from }
                }
              }
            } catch {}
          }

          return { memo: null, hash: txHash, from }
        } catch {
          return { memo: null, hash: txHash, from }
        }
      } catch {
        return { memo: null, hash: null, from: null }
      }
    }

    const saveAndNotify = (
      token: string,
      amount: string,
      memo: string | null,
      hash: string | null,
      from: string | null
    ) => {
      // Save to incoming history
      try {
        const incoming = JSON.parse(localStorage.getItem('arcflow_incoming') || '[]')
        const newItem = { token, amount, memo, hash, from, timestamp: Date.now() }
        // Avoid duplicate
        const isDuplicate = hash && incoming.some((i: any) => i.hash === hash)
        if (!isDuplicate) {
          localStorage.setItem('arcflow_incoming', JSON.stringify(
            [newItem, ...incoming].slice(0, 20)
          ))
        }
      } catch {}

      // Show toast
      toast.show({
        type: 'success',
        title: `💰 +${amount} ${token} received!`,
        desc: memo ? `📌 "${memo}"` : `From ${from ? `${from.slice(0, 6)}...${from.slice(-4)}` : 'unknown'}`,
      })
    }

    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [isConnected, address, publicClient])

  return null
}