import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #06080f 0%, #0a0d18 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(14,165,233,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.05) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          display: 'flex',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: -100, left: 200, width: 800, height: 500,
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Logo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 32px rgba(14,165,233,0.4)'
          }}>🛡</div>
          <span style={{ fontSize: 42, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-1px' }}>ArcFlow</span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-2px', lineHeight: 1 }}>
            Stablecoin DeFi
          </span>
          <span style={{
            fontSize: 56, fontWeight: 700, letterSpacing: '-2px', lineHeight: 1,
            background: 'linear-gradient(135deg, #0EA5E9, #818CF8)',
            color: 'transparent',
            // @ts-ignore
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          }}>
            Reimagined.
          </span>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
          {[
            { icon: '🌉', label: 'Bridge', color: '#0EA5E9' },
            { icon: '🔄', label: 'Swap', color: '#818CF8' },
            { icon: '📤', label: 'Send', color: '#22C55E' },
            { icon: '⚡', label: 'AI Agent', color: '#6366F1' },
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: `${f.color}12`,
              border: `1px solid ${f.color}30`,
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: f.color }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[
            { label: 'ARC Network', color: '#22C55E' },
            { label: 'Circle CCTP', color: '#0EA5E9' },
            { label: 'Groq AI', color: '#6366F1' },
            { label: 'Chain 5042002', color: '#818CF8' },
          ].map(b => (
            <span key={b.label} style={{
              fontSize: 13, fontFamily: 'monospace',
              padding: '4px 12px', borderRadius: 8,
              background: `${b.color}10`,
              color: b.color, border: `1px solid ${b.color}20`
            }}>{b.label}</span>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}