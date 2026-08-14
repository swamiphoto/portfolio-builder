import { useState } from 'react'

// The first thing a new photographer does is claim their address — so make it a
// moment, not a form field. The address itself is the hero: as they type, their
// name fills a big serif line, "yourname.sepia.photo", the way it'll read on a card.

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export default function UrlClaimStep({ rootDomain, username, setUsername, slug, error, saving, onSubmit }) {
  const [focused, setFocused] = useState(false)
  const showSlugHint = slug && slug !== username.toLowerCase()

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans" style={{ background: 'var(--desk, #e8e2d9)', padding: '0 24px' }}>
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 860, textAlign: 'center' }}>
        <p className="font-fraunces" style={{ fontSize: 21, fontStyle: 'italic', color: '#5a4a36', marginBottom: 8 }}>
          Set your studio URL
        </p>
        <p style={{ fontSize: 12.5, color: '#a8967a', marginBottom: 28 }}>
          (You can set a custom domain later)
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

        <p style={{ fontSize: 16, color: '#8a7a62', marginTop: showSlugHint ? 14 : 26, lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', textWrap: 'balance' }}>
          Lowercase letters, numbers, and hyphens. You can change it anytime.
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
    </div>
  )
}
