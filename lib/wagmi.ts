import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arcTestnet } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'ArcFlow',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains: [arcTestnet],
  ssr: true,
})

export const CONTRACTS = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  EURC: process.env.NEXT_PUBLIC_EURC_ADDRESS as `0x${string}`,
  SIMPLE_AMM: process.env.NEXT_PUBLIC_SIMPLE_AMM_ADDRESS as `0x${string}`,
}

export const ARC_CHAIN_ID = 5042002