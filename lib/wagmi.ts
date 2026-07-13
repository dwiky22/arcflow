import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

// Arc Testnet
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

// Arc Mainnet
export const arcMainnet = defineChain({
  id: 5042,
  name: 'ARC Mainnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.blockdaemon.mainnet.arc.io', 'https://5042.rpc.thirdweb.com'] },
    public: { http: ['https://rpc.blockdaemon.mainnet.arc.io', 'https://5042.rpc.thirdweb.com'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://arc-mainnet.cloud.blockscout.com' },
  },
  testnet: false,
})

export const config = getDefaultConfig({
  appName: 'ArcFlow',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains: [arcTestnet, arcMainnet],
  ssr: true,
})

// Contract addresses per network
export const CONTRACTS = {
  // Arc Testnet
  USDC: '0x3600000000000000000000000000000000000000' as `0x${string}`,
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
  SIMPLE_AMM: '0x708a03F911231266f39c10a2d69BA2ABEF620728' as `0x${string}`,
}

// Mainnet contract addresses (USDC native address same on Arc)
export const MAINNET_CONTRACTS = {
  USDC: '0x3600000000000000000000000000000000000000' as `0x${string}`,
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
}