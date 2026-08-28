import { useState } from 'react'

// The first thing a new photographer does after the invite gate is claim their
// address — so make it a moment, not a form field. The address itself is the
// hero: as they type, their name fills a big serif line, "yourname.sepia.photo",
// the way it'll read on a card.

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export default function UrlClaimStep({ rootDomain, username, setUsername, slug, error, saving, onSubmit }) {
  const [focused, setFocused] = useState(false)
  const showSlugHint = slug && slug !== username.toLowerCase()

  return (
    <div className="flex flex-col items-center justify-center font-sans" style={{ minHeight: '100dvh', background: 'var(--desk, #e8e2d9)', padding: '0 24px', position: 'relative' }}>
      {/* Sepia logo, top-left — same script wordmark as the home page and step 2 */}
      <div style={{ position: 'absolute', top: 0, left: 0, padding: '22px 28px' }}>
        <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
      </div>

      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 860, textAlign: 'center' }}>
        <p className="font-fraunces" style={{ fontSize: 21, color: '#5a4a36', marginBottom: 30 }}>
          Now, pick your portfolio&rsquo;s address.
        </p>

        {/* the hero: a live, oversized address */}
        <label htmlFor="claim-username" className="sr-only">Your username</label>
        <div
          className="font-fraunces"
          style={{
            display: 'inline-flex', alignItems: 'baseline', maxWidth: '100%',
            fontSize: 'clamp(34px, 7vw, 68px)', fontWeight: 400, lineHeight: 1.05, color: '#2c2416',
          }}
        >
          <span
            style={{
              position: 'relative', display: 'inline-block',
              borderBottom: `2px solid ${focused ? '#8b6f47' : 'rgba(120,100,70,0.35)'}`,
              transition: 'border-color 0.15s',
            }}
          >
            {/* sizer keeps the input exactly as wide as its text */}
            <span aria-hidden="true" style={{ visibility: 'hidden', whiteSpace: 'pre', padding: '0 2px' }}>{username || 'yourname'}</span>
            <input
              id="claim-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="yourname"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                border: 'none', outline: 'none', background: 'transparent', padding: '0 2px',
                font: 'inherit', color: '#2c2416', textAlign: 'left',
              }}
            />
          </span>
          <span style={{ color: '#b0a084', fontWeight: 300 }}>.{rootDomain}</span>
        </div>

        {showSlugHint && (
          <p style={{ fontFamily: MONO, fontSize: 12, color: '#a8967a', marginTop: 14 }}>
            → {slug}.{rootDomain}
          </p>
        )}

        <p style={{ fontSize: 14, color: '#8a7a62', marginTop: showSlugHint ? 14 : 24, lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', textWrap: 'balance' }}>
          You can change it anytime, or set up a custom domain later.
        </p>

        {error && (
          <p style={{ fontSize: 13.5, color: '#a0451e', marginTop: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!slug || saving}
          style={{
            marginTop: 34, padding: '14px 30px',
            background: !slug || saving ? 'rgba(60,40,15,0.16)' : '#2c2416',
            color: !slug || saving ? 'rgba(246,243,236,0.5)' : '#f6f3ec',
            fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
            borderRadius: 6, border: 'none',
            cursor: !slug || saving ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (slug && !saving) e.currentTarget.style.background = '#3d2d18' }}
          onMouseLeave={(e) => { if (slug && !saving) e.currentTarget.style.background = '#2c2416' }}
        >
          {saving ? 'Claiming…' : 'Claim your address'}
        </button>
      </form>

      {/* Beta note — quiet, honest, at the moment they commit to an address */}
      <p
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 24px', textAlign: 'center',
          fontSize: 13, color: '#a8967a', lineHeight: 1.5,
          maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', textWrap: 'balance',
        }}
      >
        Sepia is in beta, and its design is still evolving.
        <br />
        Your site&rsquo;s look may shift as we refine things.
      </p>

      {/* Browser-default placeholder gray reads cold against the warm palette */}
      <style jsx global>{`
        #claim-username::placeholder {
          color: #c6b89e;
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
