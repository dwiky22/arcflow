'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: '#06080f', minHeight: '100vh', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* Grid BG */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(14,165,233,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.025) 1px,transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      {/* Glow */}
      <div style={{
        position: 'fixed', top: -100, left: '30%', width: 700, height: 500,
        background: 'radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 60,
        background: scrolled ? 'rgba(6,8,15,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(14,165,233,0.35)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>ArcFlow</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
            fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            ARC Testnet · 5042002
          </div>
          <Link href="/app" style={{
            padding: '8px 20px', borderRadius: 9,
            background: '#0EA5E9', color: '#000', fontWeight: 700,
            fontSize: 13, textDecoration: 'none',
            boxShadow: '0 0 20px rgba(14,165,233,0.3)',
            transition: 'all 0.2s'
          }}>
            Launch App →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 40px 80px'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 20,
          border: '1px solid rgba(14,165,233,0.2)',
          background: 'rgba(14,165,233,0.06)',
          fontSize: 11, fontFamily: 'monospace', color: '#38BDF8',
          marginBottom: 32, letterSpacing: '0.5px'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          BUILT ON ARC TESTNET · POWERED BY CIRCLE
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 92px)', fontWeight: 700,
          lineHeight: 1.0, letterSpacing: '-3px', marginBottom: 16
        }}>
          <span style={{ display: 'block', color: '#F1F5F9' }}>Stablecoin DeFi</span>
          <span style={{
            display: 'block',
            background: 'linear-gradient(135deg, #0EA5E9 0%, #818CF8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Reimagined.</span>
        </h1>

        <p style={{
          maxWidth: 520, margin: '0 auto 48px',
          fontSize: 17, lineHeight: 1.7, color: '#94A3B8'
        }}>
          Bridge, swap, and send <strong style={{ color: '#F1F5F9' }}>USDC & EURC</strong> natively on Arc Network.
          AI-powered commands execute on-chain — no redirects, no third-party apps.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 72 }}>
          <Link href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 12,
            background: '#0EA5E9', color: '#000', fontWeight: 700,
            fontSize: 15, textDecoration: 'none',
            boxShadow: '0 0 32px rgba(14,165,233,0.35)',
            transition: 'all 0.2s'
          }}>
            ▶ Launch App
          </Link>
          <a href="#how" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F1F5F9', fontWeight: 500, fontSize: 15, textDecoration: 'none'
          }}>
            How it works ↓
          </a>
        </div>

        {/* Stats Bar */}
        <div style={{
          display: 'flex', background: '#0a0d18',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, overflow: 'hidden'
        }}>
          {[
            { val: '<1s', lbl: 'Finality' },
            { val: '$0.01', lbl: 'Gas Cost' },
            { val: 'USDC', lbl: 'Native Gas' },
            { val: '4', lbl: 'Core Features' },
            { val: '5042002', lbl: 'Chain ID' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '18px 28px', textAlign: 'center',
              borderRight: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0EA5E9', fontFamily: 'monospace' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 40px' }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>
            How it works
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.1 }}>
            Everything on-chain,<br/>nothing redirected.
          </h2>
          <p style={{ color: '#64748B', fontSize: 15, marginBottom: 56, maxWidth: 480 }}>
            Four core features, all executed natively inside ArcFlow.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {[
              { n: '01', icon: '🌉', title: 'Bridge', color: '#0EA5E9', desc: 'Move USDC or EURC cross-chain via Circle\'s native CCTP protocol. Burn on source chain, mint natively on Arc — no wrapped tokens.' },
              { n: '02', icon: '🔄', title: 'Swap', color: '#818CF8', desc: 'Swap USDC ↔ EURC directly on Arc Testnet via a public AMM pool. Low slippage, 0.3% fee, open to all users.' },
              { n: '03', icon: '📤', title: 'Send', color: '#22C55E', desc: 'Transfer USDC or EURC to any address on Arc Testnet instantly. Review summary before confirming, MAX button supported.' },
              { n: '04', icon: '⚡', title: 'AI Agent', color: '#6366F1', desc: 'Type natural language — "bridge 50 USDC then swap to EURC" — and the AI agent parses and executes on-chain via Groq.' },
            ].map(c => (
              <div key={c.n} style={{
                background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '32px',
                transition: 'border-color 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${c.color}30`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', marginBottom: 16, letterSpacing: '1px' }}>{c.n}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: `${c.color}12`, border: `1px solid ${c.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                }}>{c.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, color: '#F1F5F9' }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 40px' }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0EA5E9', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>
            Built with
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 48 }}>
            Production-grade stack.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            {[
              { cat: 'Blockchain', name: 'ARC Network', desc: 'L1 · Chain 5042002 · ~0.48s blocks', color: '#0EA5E9', tag: 'EVM Compatible' },
              { cat: 'Bridge', name: 'Circle CCTP', desc: 'Native burn & mint · No wrapped tokens', color: '#0EA5E9', tag: 'bridge-kit' },
              { cat: 'Wallet', name: 'RainbowKit', desc: 'wagmi v2 · viem · arcTestnet built-in', color: '#818CF8', tag: 'wagmi v2' },
              { cat: 'Frontend', name: 'Next.js 14', desc: 'App Router · TypeScript · Tailwind', color: '#22C55E', tag: 'App Router' },
              { cat: 'AI Agent', name: 'Groq LLaMA', desc: 'llama3-70b · Natural language → tx', color: '#6366F1', tag: 'llama3-70b' },
            ].map(t => (
              <div key={t.name} style={{
                background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '20px 18px',
                transition: 'border-color 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${t.color}30`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{t.cat}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5, marginBottom: 12 }}>{t.desc}</div>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace',
                  background: `${t.color}10`, color: t.color, border: `1px solid ${t.color}20`
                }}>{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.04), rgba(99,102,241,0.04))'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 20 }}>
              Start using<br/>ArcFlow today.
            </h2>
            <p style={{ color: '#64748B', lineHeight: 1.7, marginBottom: 32, fontSize: 15 }}>
              Connect your wallet, get free testnet USDC from Circle faucet, and start bridging, swapping, and sending stablecoins on Arc Network.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/app" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10,
                background: '#0EA5E9', color: '#000', fontWeight: 700,
                fontSize: 14, textDecoration: 'none',
                boxShadow: '0 0 24px rgba(14,165,233,0.3)'
              }}>
                Launch App →
              </Link>
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F1F5F9', fontWeight: 500, fontSize: 14, textDecoration: 'none'
              }}>
                Get Test Tokens ↗
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { n: '1', title: 'Connect Wallet', desc: 'MetaMask, Rabby, or any EVM wallet — Arc Testnet added automatically.' },
              { n: '2', title: 'Get Test Tokens', desc: 'Claim free USDC & EURC from Circle faucet at faucet.circle.com.' },
              { n: '3', title: 'Use All Features', desc: 'Bridge, Swap, Send, or type an AI command — all native on Arc.' },
            ].map(s => (
              <div key={s.n} style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                background: '#0a0d18', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '18px 20px'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#0EA5E9', fontFamily: 'monospace'
                }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '48px 48px 40px', maxWidth: 1100, margin: '0 auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 2z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>ArcFlow</span>
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, maxWidth: 240 }}>
              Decentralized stablecoin DeFi built natively on Arc Network. Testnet only.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)',
              fontSize: 10, fontFamily: 'monospace', color: '#0EA5E9'
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              ARC Testnet · 5042002
            </div>
          </div>

          {[
            { title: 'Protocol', links: [{ label: 'Dashboard', href: '/app' }, { label: 'Bridge', href: '/app' }, { label: 'Swap', href: '/app' }, { label: 'Send', href: '/app' }, { label: 'AI Agent', href: '/app' }] },
            { title: 'Arc Network', links: [{ label: 'Arc Official ↗', href: 'https://arc.io' }, { label: 'ArcScan ↗', href: 'https://testnet.arcscan.app' }, { label: 'Faucet ↗', href: 'https://faucet.circle.com' }, { label: 'Docs ↗', href: 'https://docs.arc.io' }] },
            { title: 'Developer', links: [{ label: 'GitHub ↗', href: 'https://github.com/dwiky22' }, { label: 'Twitter / X ↗', href: 'https://twitter.com/dwiky22' }, { label: 'ArcScan ↗', href: 'https://testnet.arcscan.app' }] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>{col.title}</h4>
              {col.links.map(l => (
                <a key={l.label} href={l.href} style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 8, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >{l.label}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 12, color: '#475569'
        }}>
          <span>© 2026 ArcFlow · Built on Arc Network Testnet</span>
          <span>Made with ❤️ by <a href="https://github.com/dwiky22" style={{ color: '#475569', textDecoration: 'none' }}>dwiky22</a></span>
        </div>
      </footer>
    </div>
  )
}