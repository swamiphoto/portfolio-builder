// pages/print/confirmation.js
import Head from 'next/head'

const SERIF_DISPLAY = '"Cormorant Garamond", Georgia, serif'
const SERIF_LABEL = '"Fraunces", Georgia, serif'

export default function PrintConfirmation() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4efe8',
        padding: '32px 24px',
      }}
    >
      <Head>
        <title>Order confirmed</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
        {/* Seal */}
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 22px',
            borderRadius: '50%',
            background: 'rgba(139,111,71,0.10)',
            border: '1px solid rgba(139,111,71,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b6f47" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <p
          style={{
            fontFamily: SERIF_LABEL,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontSize: 11.5,
            color: '#a8967a',
            margin: 0,
          }}
        >
          Order confirmed
        </p>

        <h1
          style={{
            fontFamily: SERIF_DISPLAY,
            fontWeight: 500,
            fontSize: 40,
            lineHeight: 1.12,
            color: '#2c2416',
            margin: '12px auto 16px',
            maxWidth: 420,
            textWrap: 'balance',
          }}
        >
          Thank you. Your print is on its way.
        </h1>

        <p style={{ color: '#5c4f3a', lineHeight: 1.65, fontSize: 15.5, margin: '0 auto', maxWidth: 440 }}>
          We’ve emailed your receipt. Every Sepia print is made to order on archival,
          museum-grade paper by a professional fine-art lab, then shipped to your door
          with tracking. We’ll email you the moment it’s on its way.
        </p>

        <p
          style={{
            color: '#a8967a',
            fontSize: 12.5,
            fontFamily: SERIF_LABEL,
            letterSpacing: '0.04em',
            margin: '18px auto 0',
          }}
        >
          Printed to last a lifetime on your wall.
        </p>

        <div style={{ marginTop: 30 }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              fontFamily: SERIF_LABEL,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: 11.5,
              color: '#3a2f1e',
              textDecoration: 'none',
              padding: '11px 26px',
              borderRadius: 999,
              border: '1px solid rgba(92,79,58,0.45)',
            }}
          >
            Continue browsing
          </a>
        </div>
      </div>
    </div>
  )
}
