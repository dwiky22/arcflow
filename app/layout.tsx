import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'ArcFlow — Stablecoin DeFi on Arc Network',
  description: 'Bridge, swap, and send USDC & EURC natively on Arc Network. AI-powered commands execute on-chain — no redirects, no third-party apps.',
  keywords: ['ArcFlow', 'Arc Network', 'DeFi', 'USDC', 'EURC', 'Circle CCTP', 'stablecoin'],
  authors: [{ name: 'dwiky22', url: 'https://github.com/dwiky22' }],
  openGraph: {
    title: 'ArcFlow — Stablecoin DeFi on Arc Network',
    description: 'Bridge, swap, and send USDC & EURC natively on Arc Network.',
    url: 'https://arcflow-khaki.vercel.app',
    siteName: 'ArcFlow',
    images: [{ url: 'https://arcflow-khaki.vercel.app/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArcFlow — Stablecoin DeFi on Arc Network',
    description: 'Bridge, swap, and send USDC & EURC natively on Arc Network.',
    creator: '@dwiky22',
    images: ['https://arcflow-khaki.vercel.app/og'],
  },
  metadataBase: new URL('https://arcflow-khaki.vercel.app'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}