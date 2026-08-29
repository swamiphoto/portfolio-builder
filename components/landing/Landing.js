import { useState } from 'react'
import { signIn } from 'next-auth/react'
import GallerySampler from './GallerySampler'
import HeroShot from './HeroShot'

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
  serif: "'Schibsted Grotesk', system-ui, sans-serif",
  script: "'Italianno', cursive",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
}

// The list grows as the product does — keep each line short enough to scan.
// tilt/lift scatter the cards like prints on a desk; float staggers the idle bob.
const ITEMS = [
  { label: 'gorgeous galleries', desc: 'clean, museum-style displays for your photos', tilt: -2, lift: 6, float: 0 },
  { label: 'fast to build', desc: 'assemble blocks of photos, video, and text, like Lego', tilt: 1.4, lift: -10, float: -2.1 },
  { label: 'emotional slideshows', desc: 'reel-like music slideshows that move clients to tears', tilt: -1, lift: 12, float: -4.4 },
  { label: 'one-click print store', desc: 'sell prints from any photo, no store to run', tilt: 2.2, lift: -6, float: -1.2 },
  { label: 'client galleries', desc: 'deliver shoots, collect favorites, get paid', tilt: -1.6, lift: 8, float: -3.3 },
]

function Eyebrow({ children }) {
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.accent }}>
      {children}
    </span>
  )
}

function FooterLink({ href, children }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ color: hover ? T.body : T.faint, textDecoration: 'none', transition: 'color 0.15s ease' }}
    >
      {children}
    </a>
  )
}

export default function Landing() {
  const [btnHover, setBtnHover] = useState(false)
  const [linkHover, setLinkHover] = useState(false)
  const [nameHover, setNameHover] = useState(false)
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
          Make them <em style={{ fontStyle: 'italic', fontWeight: 400 }}>feel</em> your photography.
        </h1>

        {/* What Sepia is — a point of view, not a feature list */}
        <p style={{ fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.6, color: T.body, margin: '18px 0 0', maxWidth: 560, textWrap: 'balance' }}>
          Sepia is a refreshing new take on building photography portfolios: museum-style galleries, slideshows cut to music, and prints and client delivery built in.
        </p>

        {/* Single clear action + a quiet sign-in for returning users */}
        <div className="cta-row" style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 28 }}>
          <button
            onClick={handleSignIn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            Try Sepia
            <span style={{ fontSize: 20, lineHeight: 1, marginLeft: 8 }}>→</span>
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

        {/* The product itself, tilted in perspective and straightening as you
            scroll to it. */}
        <div style={{ marginTop: 'clamp(40px, 8vh, 68px)', display: 'flex', justifyContent: 'center', width: '100vw' }}>
          <HeroShot src="/home-editor-shot.jpg" />
        </div>

        {/* Why it's magical — small cards scattered like notes on a desk,
            each bobbing gently on its own rhythm. */}
        {/* The section is itself the wide flex item (not a 100%-wide wrapper
            with an overflowing child) — the column's alignItems centers it
            over the viewport; auto margins on an overflowing child would
            collapse to 0 and shove the row off to the right. */}
        <div style={{ width: 'min(880px, 94vw)', marginTop: 'clamp(52px, 10vh, 88px)' }}>
          <Eyebrow>why it's magical</Eyebrow>
          {/* Width caps at three cards per row, so five cards break 3 + 2 —
              a 4 + 1 wrap leaves a lonely straggler. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(16px, 2.5vw, 26px)', marginTop: 34, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            {ITEMS.map(({ label, desc, tilt, lift, float }) => (
              // Outer layer floats (transform-only, so siblings never shift);
              // inner layer carries the static desk-scatter tilt.
              <div key={label} className="magic-card" style={{ '--float-delay': `${float}s`, '--card-lift': `${lift}px` }}>
                <div
                  style={{
                    width: 196,
                    padding: '20px 18px 18px',
                    textAlign: 'left',
                    background: MODE === 'light' ? '#fbf7ee' : '#211d16',
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    boxShadow: '0 16px 26px -20px rgba(26,18,10,0.4), 0 2px 5px rgba(26,18,10,0.06)',
                    transform: `rotate(${tilt}deg)`,
                  }}
                >
                  <div style={{ fontFamily: FONT.mono, fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '0.01em', lineHeight: 1.35 }}>{label}</div>
                  <div style={{ fontFamily: FONT.sans, fontSize: 13, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          .magic-card { animation: magicFloat 7s ease-in-out var(--float-delay, 0s) infinite alternate; }
          @keyframes magicFloat {
            from { transform: translateY(var(--card-lift, 0px)); }
            to { transform: translateY(calc(var(--card-lift, 0px) - 7px)); }
          }
          @media (prefers-reduced-motion: reduce) {
            .magic-card { animation: none; }
          }
        `}</style>

        {/* Founder note — frank about being early */}
        <div style={{ width: '100%', marginTop: 'clamp(34px, 7vh, 58px)', textAlign: 'left' }}>
          <div style={{ marginBottom: 16 }}>
            <Eyebrow>built by a photographer</Eyebrow>
          </div>
          <p style={{ fontFamily: FONT.serif, fontSize: 17, lineHeight: 1.62, color: T.body, margin: 0, textWrap: 'pretty' }}>
            In the 15 years I’ve been a photographer, I’ve tried every portfolio builder, and not one felt like it was truly
            made for photographers. Pixieset came close. I sweated the details on Sepia only another photographer would
            appreciate.
          </p>
          <p style={{ fontFamily: FONT.mono, fontSize: 12.5, letterSpacing: '0.02em', color: T.muted, margin: '18px 0 0' }}>
            <a
              href="https://www.swamiphoto.com"
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setNameHover(true)}
              onMouseLeave={() => setNameHover(false)}
              style={{ color: nameHover ? T.accent : T.ink, textDecoration: 'underline', textUnderlineOffset: 3, transition: 'color 0.15s ease' }}
            >
              Swami Venkat
            </a>
            , Founder of Sepia
          </p>
        </div>

        {/* A sampling of Sepia sites, drifting by full-bleed — after the
            founder note, so the quote reads first. No heading: the screens
            speak for themselves. The column is a centered flex container, so a
            100vw item is centered over the viewport by alignItems alone (a
            margin offset here would double-shift the section off-center). */}
        <div style={{ width: '100vw', marginTop: 'clamp(44px, 9vh, 72px)', overflow: 'hidden' }}>
          <GallerySampler />
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
          <FooterLink href="/terms">Terms</FooterLink>
          <span aria-hidden="true">·</span>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <span aria-hidden="true">·</span>
          <span>Made in San Francisco</span>
        </div>
      </div>
    </div>
  )
}
