// components/image-displays/engagement/EngagementActions.js
import React from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import PhotoFeedbackBadge from './PhotoFeedbackBadge'

const PILL = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(240,232,216,0.58)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  borderRadius: 999,
  boxShadow: '0 1px 5px rgba(20,14,8,0.14)',
  overflow: 'hidden',
  transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
}

const BTN = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '8px 12px',
  fontSize: 12,
  color: '#2c2416',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  lineHeight: 1,
  transition: 'background 0.15s ease',
}

function pillIn(e) {
  e.currentTarget.style.background = 'rgba(240,232,216,0.88)'
  e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,14,8,0.20)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
function pillOut(e) {
  e.currentTarget.style.background = 'rgba(240,232,216,0.58)'
  e.currentTarget.style.boxShadow = '0 1px 5px rgba(20,14,8,0.14)'
  e.currentTarget.style.transform = 'translateY(0)'
}

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? '#c14a4a' : 'none'} stroke={filled ? '#c14a4a' : 'currentColor'} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

const DIVIDER = <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(44,36,22,0.09)', flexShrink: 0 }} />

export default function EngagementActions({ imageUrl }) {
  const ctx = useClientEngagement()
  if (!ctx) return null

  if (ctx.mode === 'review') {
    return (
      <div data-engagement="always-visible">
        <PhotoFeedbackBadge
          favCount={ctx.favoriteCount(imageUrl)}
          commentCount={ctx.commentCount(imageUrl)}
          onOpen={() => ctx.openReview(imageUrl)}
        />
      </div>
    )
  }

  const { favorites, comments, downloads } = ctx.features
  if (!favorites && !comments && !downloads) return null

  const mine = ctx.isFavorited(imageUrl)
  const favCount = ctx.favoriteCount(imageUrl)
  const comCount = ctx.commentCount(imageUrl)
  const sections = [favorites && 'favorites', comments && 'comments', downloads && 'downloads'].filter(Boolean)

  return (
    <div style={PILL} onMouseEnter={pillIn} onMouseLeave={pillOut}>
      {sections.map((section, i) => (
        <React.Fragment key={section}>
          {i > 0 && DIVIDER}
          {section === 'favorites' && (
            <button
              type="button"
              aria-label="Favorite photo"
              onClick={(e) => { e.stopPropagation(); ctx.toggleFavorite(imageUrl) }}
              style={BTN}
            >
              <HeartIcon filled={mine} />
              {favCount > 0 && <span>{favCount}</span>}
            </button>
          )}
          {section === 'comments' && (
            <button
              type="button"
              aria-label="Comments on photo"
              onClick={(e) => { e.stopPropagation(); ctx.openComments(imageUrl) }}
              style={BTN}
            >
              <CommentIcon />
              {comCount > 0 && <span>{comCount}</span>}
            </button>
          )}
          {section === 'downloads' && (
            <button
              type="button"
              aria-label="Download photo"
              onClick={(e) => { e.stopPropagation(); ctx.openDownload(imageUrl) }}
              style={BTN}
            >
              <DownloadIcon />
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
