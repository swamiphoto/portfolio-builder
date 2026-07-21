// components/image-displays/engagement/CommentsPanel.js
// Per-photo comments: bottom sheet on small screens, centered card on desktop.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import { getSizedUrl } from '../../../common/imageUtils'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function CommentsPanel({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [draft, setDraft] = useState('')
  if (!ctx) return null
  const comments = ctx.commentsFor(photoUrl)

  function submit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    ctx.addComment(photoUrl, text)
    setDraft('')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.45)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: 'var(--card)',
          maxHeight: '80vh',
          boxShadow: 'var(--popover-shadow)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-warm-light)' }}>
          <img
            src={getSizedUrl(photoUrl, 'thumbnail')}
            alt=""
            style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
          />
          <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>Comments</div>
          <button
            onClick={onClose}
            aria-label="Close comments"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto scroll-thin" style={{ padding: '16px 20px' }}>
          {comments.length === 0 && (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>No comments yet — be the first.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map(c => (
              <div key={c.id}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, letterSpacing: '0.01em' }}>
                  {c.name} · {timeAgo(c.ts)}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{c.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        {ctx.features.comments && (
          <div style={{ padding: '6px 20px 18px' }}>
            <form onSubmit={submit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                maxLength={1000}
                className="site-input"
                style={{
                  flex: 1, borderBottom: '1px solid var(--border-warm)', background: 'transparent',
                  padding: '6px 0', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                style={{
                  background: 'var(--sepia-accent)', color: '#faf8f4', border: 'none',
                  padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0,
                  opacity: draft.trim() ? 1 : 0.4, transition: 'opacity 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={e => { if (draft.trim()) e.currentTarget.style.background = '#7a6040' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--sepia-accent)' }}
              >
                Post
              </button>
            </form>
            {ctx.identity && (
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Commenting as {ctx.identity.name} ·{' '}
                <button
                  onClick={() => ctx.switchIdentity()}
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, padding: 0 }}
                >
                  Not you?
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
