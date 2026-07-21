// components/image-displays/engagement/IdentityPrompt.js
// Asked once per device: name required, email always collected.
import { useState } from 'react'

export default function IdentityPrompt({ requireEmail, initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const canSave = name.trim() && (!requireEmail || /.+@.+\..+/.test(email.trim()))

  function submit(e) {
    e.preventDefault()
    if (canSave) onSave(name.trim(), email.trim())
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(20,14,8,0.45)' }}
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--card, #fdf9f4)',
          borderRadius: 16,
          boxShadow: 'var(--popover-shadow, 0 8px 40px rgba(20,14,8,0.28))',
          border: '1px solid var(--card-border, rgba(44,36,22,0.08))',
          padding: '28px 28px 24px',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Who&rsquo;s picking?
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            So the photographer knows who this is from. Asked just once.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted, #8a7560)' }}>Name</div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              className="site-input"
              style={{
                width: '100%', borderBottom: '1px solid var(--border-warm, rgba(44,36,22,0.18))', background: 'transparent',
                padding: '6px 0', fontSize: 14, color: 'var(--text-primary, #2c2416)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted, #8a7560)' }}>Email{!requireEmail && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (optional)</span>}</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={requireEmail ? 'your@email.com' : 'your@email.com'}
              maxLength={200}
              className="site-input"
              style={{
                width: '100%', borderBottom: '1px solid var(--border-warm, rgba(44,36,22,0.18))', background: 'transparent',
                padding: '6px 0', fontSize: 14, color: 'var(--text-primary, #2c2416)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none',
              padding: '6px 10px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            style={{
              background: 'var(--sepia-accent)', color: '#faf8f4', border: 'none',
              padding: '8px 20px', borderRadius: 7, fontSize: 14, fontWeight: 500,
              cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.4,
              transition: 'opacity 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={e => { if (canSave) e.currentTarget.style.background = '#7a6040' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sepia-accent)' }}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  )
}
