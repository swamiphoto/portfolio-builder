import { COVER_FALLBACK_BG } from '../../../common/coverBackground'

const SERIF = "'Fraunces', Georgia, serif"

// A reserved, non-draggable row that represents the site cover in the Pages list.
// It is NOT a page in siteConfig.pages — clicking it selects the cover editor.
export default function CoverPageRow({ siteConfig, selected, onSelect, onEnableCover }) {
  const coverOn = siteConfig?.hasCoverPage !== false
  const imageUrl = siteConfig?.cover?.imageUrl || ''

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 10px', margin: '0 8px', borderRadius: 5,
    cursor: 'pointer', border: 'none', width: 'calc(100% - 16px)', textAlign: 'left',
    background: selected ? '#f6f3ec' : 'transparent',
    boxShadow: selected ? 'inset 0 0 0 1px rgba(26,18,10,0.10)' : 'none',
    transition: 'background 120ms',
  }
  const hoverOn = (e) => { if (!selected) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }
  const hoverOff = (e) => { if (!selected) e.currentTarget.style.background = 'transparent' }

  if (!coverOn) {
    return (
      <button type="button" onClick={onEnableCover} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
        style={{ ...rowStyle, color: '#b0a490' }}>
        <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, border: '1px dashed rgba(26,18,10,0.18)' }} />
        <span style={{ fontFamily: SERIF, fontSize: 13, flex: 1 }}>Add a cover page</span>
      </button>
    )
  }

  return (
    <button type="button" onClick={onSelect} onMouseEnter={hoverOn} onMouseLeave={hoverOff} style={rowStyle}>
      <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, overflow: 'hidden', display: 'block', background: imageUrl ? undefined : COVER_FALLBACK_BG }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 13, color: '#3a362f', flex: 1 }}>Cover page</span>
    </button>
  )
}
