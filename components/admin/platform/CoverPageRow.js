import { COVER_FALLBACK_BG } from '../../../common/coverBackground'

const SERIF = "'Fraunces', Georgia, serif"

function IconGear(p) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// The site cover, shown as a row inside the Pages list. It is NOT a page in
// siteConfig.pages — clicking it selects the cover; the gear opens the cover
// settings popup. Styled to match a normal page row; the only distinct state is
// when the cover is turned off ("Add a cover page").
export default function CoverPageRow({ siteConfig, selected, onSelect, onConfigure, onEnableCover }) {
  const coverOn = siteConfig?.hasCoverPage !== false
  const imageUrl = siteConfig?.cover?.imageUrl || ''

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 10px', margin: '0 8px', borderRadius: 5, cursor: 'pointer',
    background: selected ? '#f6f3ec' : 'transparent',
    boxShadow: selected ? 'inset 0 0 0 1px rgba(26,18,10,0.10)' : 'none',
    transition: 'background 120ms',
  }
  const hoverOn = (e) => { if (!selected) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }
  const hoverOff = (e) => { if (!selected) e.currentTarget.style.background = 'transparent' }

  if (!coverOn) {
    return (
      <button
        type="button"
        onClick={onEnableCover}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
        style={{ ...rowStyle, width: 'calc(100% - 16px)', textAlign: 'left', border: 'none', color: '#b0a490' }}
      >
        <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, border: '1px dashed rgba(26,18,10,0.18)' }} />
        <span style={{ fontFamily: SERIF, fontSize: 13, flex: 1 }}>Add a cover page</span>
      </button>
    )
  }

  return (
    <div
      className="group"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={hoverOn}
      onMouseLeave={hoverOff}
      style={rowStyle}
    >
      <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, overflow: 'hidden', display: 'block', background: imageUrl ? undefined : COVER_FALLBACK_BG }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 13, color: '#3a362f', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cover page</span>
      <button
        type="button"
        title="Cover settings"
        onClick={(e) => { e.stopPropagation(); onConfigure?.(e.currentTarget) }}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-[120ms] flex-shrink-0"
        style={{ width: 20, height: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#9e9788' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#3a362f' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#9e9788' }}
      >
        <IconGear />
      </button>
    </div>
  )
}
