// components/image-displays/engagement/PhotoFeedbackBadge.js
// Read-only feedback badge — one horizontal pill with heart + comment inline.
// compact=true → small pill at bottom-right of block card thumbnails
// compact=false (default) → full-size pill for the preview pane
import React from 'react'
import { useTheme } from '../ThemeProvider'

function Heart({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#c14a4a" stroke="#c14a4a" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function Comment({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

export default function PhotoFeedbackBadge({ favCount = 0, commentCount = 0, onOpen, compact = false }) {
  const theme = useTheme()
  const manhattan = theme?.id === 'manhattan'
  if (!favCount && !commentCount) return null

  const iconSize = compact ? 11 : (manhattan ? 14 : 17)
  const both = favCount > 0 && commentCount > 0
  const posClass = compact ? 'absolute bottom-2 right-2 z-20' : ''

  const style = compact ? {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    background: 'rgba(249,245,238,0.55)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    border: 'none',
    borderRadius: manhattan ? 0 : 999,
    boxShadow: '0 1px 4px rgba(20,14,8,0.18)',
    fontSize: 10,
    lineHeight: 1,
    color: '#2c2416',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  } : {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    background: 'rgba(240,232,216,0.58)',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    border: 'none',
    borderRadius: manhattan ? 0 : 999,
    boxShadow: '0 1px 5px rgba(20,14,8,0.14)',
    fontSize: manhattan ? 11 : 12,
    lineHeight: 1,
    color: '#2c2416',
    cursor: 'pointer',
    transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
  }
  const segPad = compact ? '3px 5px' : (manhattan ? '5px 8px' : '8px 10px')

  return (
    <button
      type="button"
      aria-label="View client feedback"
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen() }}
      className={posClass}
      style={style}
      onMouseEnter={e => {
        if (compact) {
          e.currentTarget.style.background = 'rgba(249,245,238,0.72)'
        } else {
          e.currentTarget.style.background = 'rgba(240,232,216,0.88)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,14,8,0.20)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (compact) {
          e.currentTarget.style.background = 'rgba(249,245,238,0.55)'
        } else {
          e.currentTarget.style.background = 'rgba(240,232,216,0.58)'
          e.currentTarget.style.boxShadow = '0 1px 5px rgba(20,14,8,0.14)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {favCount > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 2 : 4, padding: segPad }}>
          <Heart size={iconSize} />
          {favCount}
        </span>
      )}
      {both && (
        <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(44,36,22,0.09)' }} />
      )}
      {commentCount > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 2 : 4, padding: segPad }}>
          <Comment size={iconSize} />
          {commentCount}
        </span>
      )}
    </button>
  )
}
