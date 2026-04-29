import { useState } from 'react'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"

const labelStyle = {
  display: 'block',
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  color: '#a8967a',
  marginBottom: 6,
}

const inputStyle = {
  display: 'block',
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(160,140,110,0.3)',
  outline: 'none',
  padding: '6px 0 8px',
  fontSize: 15,
  color: '#2c2416',
  fontFamily: 'inherit',
  transition: 'border-color 150ms',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function ContactDisplay({ heading, subheading, buttonText, toEmail }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  function set(key) {
    return e => setForm(s => ({ ...s, [key]: e.target.value }))
  }

  function focusStyle(e) { e.target.style.borderBottomColor = 'rgba(92,79,58,0.65)' }
  function blurStyle(e) { e.target.style.borderBottomColor = 'rgba(160,140,110,0.3)' }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, toEmail }),
      })
      if (!res.ok) throw new Error('send failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ maxWidth: '32rem', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 300, color: '#2c2416', marginBottom: '0.75rem' }}>
          Message sent
        </div>
        <p style={{ color: '#7a6b55', fontSize: '1rem' }}>Thank you for reaching out. I'll be in touch soon.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '32rem', margin: '0 auto', padding: '3rem 2rem' }}>
      {heading && (
        <h2 style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 300, color: '#1a1410', lineHeight: 1.15, marginBottom: subheading ? '0.75rem' : '2rem', marginTop: 0 }}>
          {heading}
        </h2>
      )}
      {subheading && (
        <p style={{ color: '#7a6b55', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', marginTop: 0 }}>
          {subheading}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Field label="Your name">
          <input
            required
            value={form.name}
            onChange={set('name')}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>

        <Field label="Email">
          <input
            required
            type="email"
            value={form.email}
            onChange={set('email')}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>

        <Field label="Subject">
          <input
            value={form.subject}
            onChange={set('subject')}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>

        <Field label="Message">
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={set('message')}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>

        {status === 'error' && (
          <p style={{ margin: 0, color: '#c14a4a', fontSize: 13 }}>
            Something went wrong. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 24px',
            background: status === 'sending' ? 'rgba(44,36,22,0.5)' : '#2c2416',
            color: '#f6f3ec',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            cursor: status === 'sending' ? 'wait' : 'pointer',
            transition: 'background 150ms',
          }}
        >
          {status === 'sending' ? 'Sending…' : (buttonText || 'Send message')}
        </button>
      </form>
    </div>
  )
}
