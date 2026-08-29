import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// Small survey shown when someone without an invite code taps "Just ask" on the
// claim screen. They're already signed in with Google, so we never ask for an
// email — the API reads it from the session and mails the operator.

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

// Line inputs, not boxes — matching the theme contact forms and the underline
// motif of the rest of onboarding (username hero, invite ticket).
const inputStyle = {
  width: '100%', padding: '7px 2px',
  border: 'none', borderBottom: '1px solid rgba(120,100,70,0.35)',
  background: 'transparent', outline: 'none',
  fontSize: 14, color: '#2c2416', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

function Field({ id, label, optional, multiline, ...inputProps }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div style={{ marginBottom: 20, textAlign: 'left' }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8967a', marginBottom: 4 }}>
        {label}{optional && <span style={{ textTransform: 'none', letterSpacing: 0 }}> (optional)</span>}
      </label>
      <Tag
        id={id}
        className="invite-req-line"
        style={multiline ? { ...inputStyle, resize: 'none', lineHeight: 1.5, overflow: 'hidden' } : inputStyle}
        autoComplete="off"
        spellCheck={multiline}
        {...(multiline ? {
          rows: 1,
          // Grow with the text so the underline never cuts through a line
          onInput: (e) => {
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
          },
        } : {})}
        {...inputProps}
      />
    </div>
  )
}

export default function InviteRequestModal({ onClose }) {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  const [photographyType, setPhotographyType] = useState('')
  const [whySepia, setWhySepia] = useState('')
  const [currentPortfolio, setCurrentPortfolio] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const incomplete = !name.trim() || !photographyType.trim() || !whySepia.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (incomplete || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/invite-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          photographyType: photographyType.trim(),
          whySepia: whySepia.trim(),
          currentPortfolio: currentPortfolio.trim(),
        }),
      })
      if (!res.ok) throw new Error('send failed')
      setSent(true)
    } catch {
      setError("That didn't go through. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const email = session?.user?.email

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(44,36,22,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-request-title"
        onClick={(e) => e.stopPropagation()}
        className="font-sans"
        style={{
          width: '100%', maxWidth: 420, background: '#f6f2ea', borderRadius: 12,
          padding: '34px 34px 30px', textAlign: 'center',
          boxShadow: '0 24px 60px rgba(44,36,22,0.35)',
        }}
      >
        {sent ? (
          <>
            <h2 id="invite-request-title" className="font-schibsted" style={{ fontSize: 24, fontWeight: 400, color: '#2c2416', marginBottom: 12 }}>
              Thanks{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}.
            </h2>
            <p style={{ fontSize: 14.5, color: '#7a6b55', lineHeight: 1.6, marginBottom: 24 }}>
              {email ? `Your request is in. I'll reply to ${email} with a code soon.` : "Your request is in. I'll be in touch with a code soon."}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 26px', background: '#2c2416', color: '#f6f3ec',
                fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
                borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3d2d18' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2c2416' }}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 id="invite-request-title" className="font-schibsted" style={{ fontSize: 24, fontWeight: 400, color: '#2c2416', marginBottom: 10 }}>
              Ask for an invite
            </h2>
            <p style={{ fontSize: 14.5, color: '#7a6b55', lineHeight: 1.6, marginBottom: 24, textWrap: 'balance' }}>
              Tell me a bit about you and your work, and I&rsquo;ll send a code your way.
            </p>

            <form onSubmit={handleSubmit}>
              <Field
                id="invite-req-name"
                label="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Field
                id="invite-req-type"
                label="What do you photograph?"
                value={photographyType}
                onChange={(e) => setPhotographyType(e.target.value)}
                placeholder="Weddings, portraits, landscapes…"
                autoFocus
              />
              <Field
                id="invite-req-why"
                label="What brings you to Sepia?"
                multiline
                value={whySepia}
                onChange={(e) => setWhySepia(e.target.value)}
                placeholder="A line or two about what you're looking for"
              />
              <Field
                id="invite-req-portfolio"
                label="Your current site"
                optional
                value={currentPortfolio}
                onChange={(e) => setCurrentPortfolio(e.target.value)}
                placeholder="Your website, Instagram, or wherever"
              />

              {error && <p style={{ fontSize: 13, color: '#a0451e', marginBottom: 14 }}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={incomplete || sending}
                  style={{
                    padding: '12px 26px',
                    background: incomplete || sending ? 'rgba(60,40,15,0.16)' : '#2c2416',
                    color: incomplete || sending ? 'rgba(246,243,236,0.5)' : '#f6f3ec',
                    fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
                    borderRadius: 6, border: 'none', transition: 'background 0.15s',
                    cursor: incomplete || sending ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!incomplete && !sending) e.currentTarget.style.background = '#3d2d18' }}
                  onMouseLeave={(e) => { if (!incomplete && !sending) e.currentTarget.style.background = '#2c2416' }}
                >
                  {sending ? 'Sending…' : 'Send request'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 14px', background: 'transparent', border: 'none',
                    color: '#9a876b', fontFamily: MONO, fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#2c2416' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9a876b' }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Warm the browser-default placeholder gray; accent the focused line */}
            <style jsx global>{`
              .invite-req-line::placeholder {
                color: #c6b89e;
                opacity: 1;
              }
              .invite-req-line:focus {
                border-bottom-color: #8b6f47;
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  )
}
