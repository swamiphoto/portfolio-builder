// components/image-displays/engagement/EngagementActions.js
// Heart + comment buttons overlaid on a public gallery photo. Self-gates on
// the engagement context (absent in the editor preview) and on feature flags,
// exactly like BuyPrintButton self-gates on the print store.
import React from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import PhotoFeedbackBadge from './PhotoFeedbackBadge'

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(249,245,238,0.9)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  border: 'none',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  color: '#2c2416',
  boxShadow: '0 1px 5px rgba(20,14,8,0.16)',
  cursor: 'pointer',
  outline: 'none',
  transition: 'background 0.18s ease, transform 0.18s ease',
}

function hoverIn(e) { e.currentTarget.style.background = 'rgba(252,249,244,1)'; e.currentTarget.style.transform = 'translateY(-1px)' }
function hoverOut(e) { e.currentTarget.style.background = 'rgba(249,245,238,0.9)'; e.currentTarget.style.transform = 'translateY(0)' }

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#c14a4a' : 'none'} stroke={filled ? '#c14a4a' : 'currentColor'} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

export default function EngagementActions({ imageUrl }) {
  const ctx = useClientEngagement()
  if (!ctx) return null

  if (ctx.mode === 'review') {
    return (
      <PhotoFeedbackBadge
        favCount={ctx.favoriteCount(imageUrl)}
        commentCount={ctx.commentCount(imageUrl)}
        onOpen={() => ctx.openReview(imageUrl)}
      />
    )
  }

  if (!ctx.features.favorites && !ctx.features.comments) return null

  const mine = ctx.isFavorited(imageUrl)
  const favCount = ctx.favoriteCount(imageUrl)
  const comCount = ctx.commentCount(imageUrl)

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {ctx.features.favorites && (
        <button
          type="button"
          aria-label="Favorite photo"
          data-engagement={mine ? 'always-visible' : undefined}
          onClick={(e) => { e.stopPropagation(); ctx.toggleFavorite(imageUrl) }}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          <HeartIcon filled={mine} />
          {favCount > 0 && <span>{favCount}</span>}
        </button>
      )}
      {ctx.features.comments && (
        <button
          type="button"
          aria-label="Comments on photo"
          onClick={(e) => { e.stopPropagation(); ctx.openComments(imageUrl) }}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          <CommentIcon />
          {comCount > 0 && <span>{comCount}</span>}
        </button>
      )}
    </div>
  )
}
