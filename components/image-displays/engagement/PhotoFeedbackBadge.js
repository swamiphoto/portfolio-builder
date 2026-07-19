// components/image-displays/engagement/PhotoFeedbackBadge.js
// Static, read-only feedback badge shown to the photographer on a photo in the
// editor (block cards + live preview). Presentational only — the caller supplies
// counts and the open handler. Renders nothing when there is no feedback.
import React from 'react'

function Heart() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#c14a4a" stroke="#c14a4a" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function Comment() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

export default function PhotoFeedbackBadge({ favCount = 0, commentCount = 0, onOpen }) {
  if (!favCount && !commentCount) return null
  return (
    <button
      type="button"
      aria-label="View client feedback"
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen() }}
      className="absolute bottom-1 left-1 z-20 inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5"
      style={{
        background: 'rgba(249,245,238,0.94)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        border: 'none',
        boxShadow: '0 1px 4px rgba(20,14,8,0.22)',
        fontSize: 10,
        lineHeight: 1,
        color: '#2c2416',
        cursor: 'pointer',
      }}
    >
      {favCount > 0 && (
        <span className="inline-flex items-center gap-0.5"><Heart />{favCount}</span>
      )}
      {commentCount > 0 && (
        <span className="inline-flex items-center gap-0.5"><Comment />{commentCount}</span>
      )}
    </button>
  )
}
