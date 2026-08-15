import { useState } from 'react'
import { signIn } from 'next-auth/react'

// Deliberately understated, text-only landing. No hero image, no screenshots,
// no borrowed bigness — just a small wordmark, a plain headline, a scannable
// list of what's good, and a frank founder note. The product lives behind the
// sign-in; this page's job is to be different enough to earn the click and
// honest enough to be taken seriously while we're early.

// Flip MODE to preview the dark treatment.
const MODE = 'light'

const PALETTES = {
  light: {
    bg: '#f5efe4',
    ink: '#1d1b17',
    body: '#4a463d',
    muted: '#8a8276',
    faint: '#b0a490',
    accent: '#8b6f47',
    border: 'rgba(26,18,10,0.11)',
    btnBg: '#1d1b17',
    btnBgHover: '#3a362f',
    btnText: '#f5efe4',
    ghostHover: '#1d1b17',
  },
  dark: {
    bg: '#17140f',
    ink: '#efe7d7',
    body: '#c4b8a3',
    muted: '#9a8f7c',
    faint: '#6d6454',
    accent: '#c2a06a',
    border: 'rgba(239,231,215,0.13)',
    btnBg: '#efe7d7',
    btnBgHover: '#fff8ea',
    btnText: '#17140f',
    ghostHover: '#efe7d7',
  },
}
const T = PALETTES[MODE]

const FONT = {
  serif: "'Fraunces', Georgia, serif",
  script: "'Italianno', cursive",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
}

// The list grows as the product does — keep each line short enough to scan.
const ITEMS = [
  ['gorgeous galleries', 'museum-like displays for your photos'],
  ['fast to build', 'build pages from simple blocks, like Lego'],
  ['emotional slideshows', 'music slideshows that move clients to tears'],
  ['one-click print store', 'sell prints from any photo, no store to run'],
  ['unified library', 'upload once, use every photo anywhere'],
  ['client galleries', 'deliver shoots, collect favorites, get paid'],
]

function Eyebrow({ children }) {
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.accent }}>
      {children}
    </span>
  )
}

export default function Landing() {
  const [btnHover, setBtnHover] = useState(false)
  const [linkHover, setLinkHover] = useState(false)
  const handleSignIn = () => signIn('google', { callbackUrl: '/auth/post-login' })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
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
            marginTop: 'clamp(30px, 6vh, 60px)',
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
            margin: '30px 0 0',
            color: T.ink,
            textWrap: 'balance',
          }}
        >
          Your beautiful photography portfolio, built in minutes.
        </h1>

        {/* One plain line saying who made it */}
        <p style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: '0.02em', color: T.muted, margin: '16px 0 0' }}>
          built by a photographer
        </p>

        {/* Single clear action + a quiet sign-in for returning users */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 28 }}>
          <button
            onClick={handleSignIn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              padding: '15px 32px',
              borderRadius: 0,
              border: 'none',
              cursor: 'pointer',
              background: btnHover ? T.btnBgHover : T.btnBg,
              color: T.btnText,
              fontFamily: FONT.mono,
              fontSize: 15,
              letterSpacing: '0.02em',
              transition: 'background 0.15s ease',
            }}
          >
            Try Sepia <span style={{ fontSize: 20, lineHeight: 0, verticalAlign: 'middle', marginLeft: 3 }}>→</span>
          </button>
          <button
            onClick={handleSignIn}
            onMouseEnter={() => setLinkHover(true)}
            onMouseLeave={() => setLinkHover(false)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: FONT.mono,
              fontSize: 13,
              letterSpacing: '0.02em',
              color: linkHover ? T.ghostHover : T.muted,
              transition: 'color 0.15s ease',
            }}
          >
            sign in
          </button>
        </div>

        {/* Why it's magical — a scannable spec of what's good */}
        <div style={{ width: '100%', marginTop: 'clamp(44px, 9vh, 76px)' }}>
          <Eyebrow>why it's magical</Eyebrow>
          <div style={{ marginTop: 20, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
            {ITEMS.map(([label, desc]) => (
              <div key={label} style={{ padding: '14px 2px', borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 14.5, color: T.ink, letterSpacing: '0.01em' }}>{label}</div>
                <div style={{ fontFamily: FONT.sans, fontSize: 14, color: T.muted, marginTop: 4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Founder note — frank about being early */}
        <div style={{ width: '100%', marginTop: 'clamp(44px, 9vh, 76px)', textAlign: 'left' }}>
          <Eyebrow>a note from the founder</Eyebrow>
          <p style={{ fontFamily: FONT.serif, fontSize: 17, lineHeight: 1.62, color: T.body, margin: '18px 0 0', textWrap: 'pretty' }}>
            In the 15 years I’ve been a photographer, I’ve tried every platform out there, and not one felt like it was truly
            made for photographers. Pixieset comes closest, but still lacks a real photographer’s workflow. So I built Sepia,
            and I sweated the details only another photographer would appreciate.
          </p>
          <p style={{ fontFamily: FONT.mono, fontSize: 12.5, letterSpacing: '0.02em', color: T.muted, margin: '18px 0 0' }}>
            —{' '}
            <a
              href="https://www.swamiphoto.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: T.ink, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Swami Venkat
            </a>{' '}
            · San Francisco
          </p>
        </div>

        {/* Minimal footer */}
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 11,
            letterSpacing: '0.04em',
            color: T.faint,
            marginTop: 'clamp(44px, 9vh, 72px)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <span>© 2026 Sepia</span>
          <span aria-hidden="true">·</span>
          <a href="/terms" style={{ color: T.faint, textDecoration: 'none' }}>Terms</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy" style={{ color: T.faint, textDecoration: 'none' }}>Privacy</a>
          <span aria-hidden="true">·</span>
          <span>Made in San Francisco</span>
        </div>
      </div>
    </div>
  )
}
