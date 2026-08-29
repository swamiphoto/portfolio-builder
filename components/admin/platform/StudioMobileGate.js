import { signOut } from 'next-auth/react'

// Shown in place of the full studio when someone opens /admin on a phone. The
// editor is a wide, three-column workspace (pages + blocks + live preview) that
// can't be used on a small screen, so rather than let them poke at a broken
// layout we send them to a desktop. Onboarding (paste URL → import → reveal) is
// mobile-friendly and stays reachable; only the editor is gated here.
export default function StudioMobileGate({ email }) {
  return (
    <div
      className="flex flex-col items-center justify-center font-sans"
      style={{ minHeight: '100dvh', background: 'var(--desk, #e8e2d9)', position: 'relative', padding: '0 28px' }}
    >
      {/* Sepia wordmark, top-left — same script mark as onboarding */}
      <div style={{ position: 'absolute', top: 0, left: 0, padding: '22px 28px' }}>
        <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
      </div>

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* A quiet monitor glyph, so the message reads at a glance */}
        <svg
          width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b0a084" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 20px' }}
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>

        <h1 className="font-schibsted" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.25, color: '#2c2416', marginBottom: 14 }}>
          The studio works best on a bigger screen
        </h1>

        <p style={{ fontSize: 16, color: '#7a6b55', lineHeight: 1.6, textWrap: 'balance' }}>
          This is where you build and arrange your site, laying out photos, pages, and galleries. It’s made for a desktop or laptop. Open <strong style={{ color: '#5a4a36', fontWeight: 500 }}>sepia.photo</strong> on a computer and you’ll pick up right where you left off.
        </p>

        {email && (
          <p style={{ marginTop: 30, fontSize: 12.5, color: '#a8967a' }}>
            Signed in as {email} ·{' '}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{ background: 'none', border: 'none', padding: 0, color: '#8b6f47', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
            >
              Sign out
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
