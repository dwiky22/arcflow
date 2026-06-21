'use client'

import { useEffect, useRef } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits, hexToString } from 'viem'
import { useToast } from './Toast'
import { CONTRACTS } from '@/lib/wagmi'
import { ERC20_ABI, MEMO_CONTRACT } from '@/lib/contracts'

// Standard ERC20 transfer(address,uint256) calldata length:
// 4 bytes selector + 32 bytes address + 32 bytes amount = 68 bytes = 136 hex chars
const STANDARD_TRANSFER_HEX_LEN = 2 + 68 * 2 // includes '0x' prefix

export default function IncomingNotifier() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const toast = useToast()
  const lastBalances = useRef<{ usdc: bigint; eurc: bigint } | null>(null)
  const initialized = useRef(false)

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
          const { memo, hash } = await findMemoAndHash(address as `0x${string}`)
          showAndSave('USDC', amount, memo, hash)
        }

        if (eurc > prev.eurc) {
          const diff = eurc - prev.eurc
          const amount = parseFloat(formatUnits(diff, 6)).toFixed(2)
          const { memo, hash } = await findMemoAndHash(address as `0x${string}`)
          showAndSave('EURC', amount, memo, hash)
        }

        lastBalances.current = { usdc, eurc }
      } catch {}
    }

    const findMemoAndHash = async (recipient: `0x${string}`): Promise<{ memo: string | null; hash: string | null }> => {
      try {
        const block = await publicClient.getBlockNumber()
        const transferLogs = await publicClient.getLogs({
          event: {
            type: 'event', name: 'Transfer',
            inputs: [
              { type: 'address', name: 'from', indexed: true },
              { type: 'address', name: 'to', indexed: true },
              { type: 'uint256', name: 'value', indexed: false },
            ],
          },
          args: { to: recipient },
          fromBlock: block - 30n,
          toBlock: block,
        })

        if (!transferLogs.length) return { memo: null, hash: null }
        const latestTransfer = transferLogs[transferLogs.length - 1]
        const txHash = latestTransfer.transactionHash || null
        if (!txHash) return { memo: null, hash: null }

        // 1. Official path: Arc's predeployed Memo contract emits a `Memo`
        // event in the same tx when memo() is used to wrap the transfer.
        try {
          const memoLogs = await publicClient.getLogs({
            address: MEMO_CONTRACT,
            event: {
              type: 'event', name: 'Memo',
              inputs: [
                { type: 'address', name: 'sender', indexed: true },
                { type: 'uint256', name: 'index', indexed: false },
                { type: 'string', name: 'message', indexed: false },
              ],
            },
            fromBlock: latestTransfer.blockNumber ? latestTransfer.blockNumber - 2n : block - 5n,
            toBlock: block,
          })

          const matchingMemo = memoLogs.find(log => log.transactionHash === txHash)
          const message = matchingMemo?.args ? (matchingMemo.args as any).message : null
          if (message) return { memo: message, hash: txHash }
        } catch {}

        // 2. Legacy fallback: older transactions appended the memo as a raw
        // hex suffix after the standard transfer calldata instead of going
        // through the Memo contract. Keep decoding this so old txs still show.
        try {
          const tx = await publicClient.getTransaction({ hash: txHash })
          const data = tx.input || '0x'

          if (data.length > STANDARD_TRANSFER_HEX_LEN) {
            const memoHex = `0x${data.slice(STANDARD_TRANSFER_HEX_LEN)}` as `0x${string}`
            const decoded = hexToString(memoHex).replace(/\0+$/, '').trim()
            if (decoded) return { memo: decoded, hash: txHash }
          }
        } catch {}

        return { memo: null, hash: txHash }
      } catch { return { memo: null, hash: null } }
    }

    const showAndSave = (token: string, amount: string, memo: string | null, hash: string | null) => {
      toast.show({
        type: 'success',
        title: `💰 +${amount} ${token} received!`,
        desc: memo ? `📌 "${memo}"` : `New ${token} on ARC Testnet`,
      })

      try {
        const history = JSON.parse(localStorage.getItem('arcflow_incoming') || '[]')

        // Skip if this hash already exists (e.g. saved by BatchSendPanel with memo)
        if (hash && history.some((item: any) => item.hash === hash)) return

        localStorage.setItem('arcflow_incoming', JSON.stringify([
          { token, amount, memo, hash, timestamp: Date.now() },
          ...history
        ].slice(0, 20)))
      } catch {}
    }

    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [isConnected, address, publicClient])

  return null
}