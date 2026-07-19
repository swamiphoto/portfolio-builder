// components/admin/gallery-builder/PhotoFeedbackPopover.js
// Read-only view of one photo's client feedback for the photographer: who
// favorited it and every comment. Opened from a PhotoFeedbackBadge.
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
      style={{ background: 'rgba(20,14,8,0.35)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[340px] max-w-[90vw] max-h-[70vh] overflow-y-auto rounded-2xl p-4"
        style={{ background: 'var(--card, #fefcf8)', boxShadow: '0 8px 40px rgba(20,14,8,0.28)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
        >
          ✕
        </button>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          Client feedback
        </div>
        {favBy.length > 0 && (
          <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: '#c14a4a' }}>❤</span> Favorited by {favBy.join(', ')}
          </div>
        )}
        {comments.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments on this photo.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {comments.map((c) => (
              <div key={c.id}>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.name} · {timeAgo(c.ts)}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
