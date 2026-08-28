import { useState } from 'react'
import InviteRequestModal from './InviteRequestModal'

// The door to Sepia: welcome + invite check, before any address claiming.
// Failing here (no code) is graceful — the ask-for-an-invite modal is the next
// step, not a consolation after they've already fallen for their new address.

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export default function InviteGateStep({ firstName, inviteCode, setInviteCode, error, checking, onSubmit }) {
  const [focused, setFocused] = useState(false)
  const [showInviteRequest, setShowInviteRequest] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans" style={{ background: 'var(--desk, #e8e2d9)', padding: '0 24px', position: 'relative' }}>
      {/* Sepia logo, top-left — same script wordmark as the home page */}
      <div style={{ position: 'absolute', top: 0, left: 0, padding: '22px 28px' }}>
        <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
      </div>

      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 620, textAlign: 'center' }}>
        {/* On this screen the welcome itself is the hero */}
        <h1 className="font-fraunces" style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, lineHeight: 1.2, color: '#2c2416', marginBottom: 14 }}>
          Welcome to Sepia{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p style={{ fontSize: 15.5, color: '#8a7a62', lineHeight: 1.6, marginBottom: 40, textWrap: 'balance' }}>
          Sepia is invite-only while in beta. Enter your code to come in.
        </p>

        <label htmlFor="claim-invite" className="sr-only">Your invite code</label>
        <input
          id="claim-invite"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="SEPIA-XXXX"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          style={{
            width: 240, padding: '8px 4px', textAlign: 'center',
            border: 'none', borderBottom: `1.5px dashed ${focused ? '#8b6f47' : 'rgba(120,100,70,0.4)'}`,
            background: 'transparent', outline: 'none', transition: 'border-color 0.15s',
            fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: '#2c2416',
          }}
        />

        {error && (
          <p style={{ fontSize: 13.5, color: '#a0451e', marginTop: 16 }}>{error}</p>
        )}

        <div style={{ marginTop: error ? 20 : 36 }}>
          <button
            type="submit"
            disabled={!inviteCode.trim() || checking}
            style={{
              padding: '14px 30px',
              background: !inviteCode.trim() || checking ? 'rgba(60,40,15,0.16)' : '#2c2416',
              color: !inviteCode.trim() || checking ? 'rgba(246,243,236,0.5)' : '#f6f3ec',
              fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
              borderRadius: 6, border: 'none',
              cursor: !inviteCode.trim() || checking ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (inviteCode.trim() && !checking) e.currentTarget.style.background = '#3d2d18' }}
            onMouseLeave={(e) => { if (inviteCode.trim() && !checking) e.currentTarget.style.background = '#2c2416' }}
          >
            {checking ? 'Checking…' : 'Come in'}
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#a8967a', marginTop: 22, lineHeight: 1.5 }}>
          Need a code?{' '}
          <button
            type="button"
            onClick={() => setShowInviteRequest(true)}
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              font: 'inherit', color: '#8b6f47',
              textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap',
            }}
          >
            Just ask
          </button>
          .
        </p>
      </form>

      {showInviteRequest && <InviteRequestModal onClose={() => setShowInviteRequest(false)} />}

      {/* Browser-default placeholder gray reads cold against the warm palette */}
      <style jsx global>{`
        #claim-invite::placeholder {
          color: #c6b89e;
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
