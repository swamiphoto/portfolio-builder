// components/admin/gallery-builder/PhotoFeedbackPopover.js
// Photographer's read-only view of one photo's client feedback.
import React from 'react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function PhotoFeedbackPopover({ feedback, onClose }) {
  const favBy = feedback?.favBy || []
  const comments = feedback?.comments || []

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[380px] max-w-[90vw] max-h-[70vh] overflow-y-auto"
        style={{
          background: 'var(--card, #fdf9f4)',
          borderRadius: 16,
          boxShadow: 'var(--popover-shadow, 0 8px 40px rgba(20,14,8,0.28))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-warm-light, rgba(44,36,22,0.08))' }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary, #2c2416)' }}>
            Client feedback
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              color: 'var(--text-muted, #8a7560)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover, rgba(44,36,22,0.06))'; e.currentTarget.style.color = 'var(--text-secondary, #5a4a35)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted, #8a7560)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {favBy.length > 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary, #5a4a35)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#c14a4a" stroke="#c14a4a" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              Favorited by {favBy.join(', ')}
            </div>
          )}

          {favBy.length > 0 && comments.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-warm-light, rgba(44,36,22,0.08))' }} />
          )}

          {comments.length === 0 && favBy.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text-muted, #8a7560)' }}>No feedback on this photo.</div>
          ) : comments.length === 0 ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {comments.map((c) => (
                <div key={c.id}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #8a7560)', marginBottom: 4 }}>{c.name} · {timeAgo(c.ts)}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary, #2c2416)', lineHeight: 1.55 }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
