import { useState } from 'react'
import { signIn } from 'next-auth/react'

// Deliberately understated, text-only landing. No hero image, no screenshots,
// no borrowed bigness — just a small wordmark, a plain headline, a scannable
// list of what's good, and a frank founder note. The product lives behind the
// sign-in; this page's job is to be different enough to earn the click and
// honest enough to be taken seriously while we're early.

const T = {
  ink: '#1d1b17',
  body: '#4a463d',
  muted: '#8a8276',
  faint: '#b0a490',
  paper: '#f5efe4',
  accent: '#8b6f47',
  border: 'rgba(26,18,10,0.11)',
}

const FONT = {
  serif: "'Fraunces', Georgia, serif",
  script: "'Italianno', cursive",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
}

// The list grows as the product does — keep each line short enough to scan.
const ITEMS = [
  ['gorgeous galleries', 'beautiful galleries you build in minutes'],
  ['emotional slideshows', 'music slideshows that move clients to tears'],
  ['one-click print store', 'sell prints from any photo, no store to run'],
  ['unified library', 'upload once, use every photo anywhere'],
  ['client galleries', 'deliver shoots, collect favorites, get paid'],
]

export default function Landing() {
  const [hover, setHover] = useState(false)
  const handleSignIn = () => signIn('google', { callbackUrl: '/auth/post-login' })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.paper,
        color: T.ink,
        fontFamily: FONT.sans,
        lineHeight: 1.5,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingBottom: 'clamp(56px, 12vh, 110px)',
        }}
      >
        {/* Wordmark */}
        <span
          style={{
            fontFamily: FONT.script,
            fontSize: 34,
            lineHeight: 1,
            color: T.ink,
            marginTop: 'clamp(56px, 13vh, 128px)',
          }}
        >
          Sepia
        </span>

        {/* Headline — quiet, to the point */}
        <h1
          style={{
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 'clamp(25px, 4.4vw, 33px)',
            lineHeight: 1.22,
            letterSpacing: '-0.01em',
            margin: '36px 0 0',
            color: T.ink,
            textWrap: 'balance',
          }}
        >
          A beautiful photography portfolio, built in minutes.
        </h1>

        {/* One plain line saying what it is */}
        <p
          style={{
            fontFamily: FONT.mono,
            fontSize: 13,
            letterSpacing: '0.02em',
            color: T.muted,
            margin: '18px 0 0',
          }}
        >
          a portfolio builder for photographers
        </p>

        {/* Single, clear action */}
        <button
          onClick={handleSignIn}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            marginTop: 30,
            padding: '12px 22px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: hover ? '#3a362f' : T.ink,
            color: T.paper,
            fontFamily: FONT.sans,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.01em',
            transition: 'background 0.15s ease',
          }}
        >
          Try Sepia →
        </button>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.04em', color: T.faint, marginTop: 12 }}>
          sign in with Google
        </span>

        {/* Why it's magical — a scannable spec of what's good */}
        <div style={{ width: '100%', marginTop: 'clamp(52px, 10vh, 88px)' }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: T.accent,
            }}
          >
            why it's magical
          </span>
          <div style={{ marginTop: 22, borderBottom: `1px solid ${T.border}` }}>
            {ITEMS.map(([label, desc]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  textAlign: 'left',
                  padding: '15px 2px',
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <span style={{ fontFamily: FONT.mono, fontSize: 14, color: T.ink, minWidth: 172, letterSpacing: '0.01em' }}>
                  {label}
                </span>
                <span style={{ fontFamily: FONT.sans, fontSize: 14.5, color: T.muted, flex: 1, minWidth: 200 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Founder note — frank about being early */}
        <div style={{ width: '100%', maxWidth: 500, marginTop: 'clamp(52px, 10vh, 88px)', textAlign: 'left' }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: T.accent,
            }}
          >
            a note from the founder
          </span>
          <p style={{ fontFamily: FONT.serif, fontSize: 17, lineHeight: 1.62, color: T.body, margin: '20px 0 0', textWrap: 'pretty' }}>
            I'm a photographer of fifteen years, and the engineer who built Sepia. I got tired of tools that were either
            beautiful or flexible but never both, so I made the one I always wanted. It's early: no big team, no glossy
            marketing, and the screenshots aren't here yet. You have to sign in to see the real thing. If you make sites for
            your photos, I'd love for you to try it and tell me where it falls short.
          </p>
          <p style={{ fontFamily: FONT.mono, fontSize: 12.5, letterSpacing: '0.02em', color: T.muted, margin: '18px 0 0' }}>
            — Swami · San Francisco
          </p>
        </div>

        {/* Minimal footer */}
        <div style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.04em', color: T.faint, marginTop: 'clamp(52px, 10vh, 84px)' }}>
          © 2026 Sepia
        </div>
      </div>
    </div>
  )
}
