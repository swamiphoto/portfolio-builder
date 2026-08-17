// components/image-displays/themes/shared/WallFit.js
// Shared image-fit primitives for the horizontal wall themes (Florence, Amsterdam).
import { useRef, useEffect } from 'react'
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'
import BuyPrintButton from '../../print/BuyPrintButton'
import EngagementActions from '../../engagement/EngagementActions'
import WatermarkOverlay from '../../engagement/WatermarkOverlay'

export function Overlays({ url, print }) {
  return (
    <>
      <WatermarkOverlay />
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <BuyPrintButton print={print} imageUrl={url} />
      </div>
      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
        <EngagementActions imageUrl={url} />
      </div>
    </>
  )
}

// A height-driven placeholder box in the same fit format as FitImg, so an empty
// photo block previews the wall layout (frames and all) before any photos exist.
export function FitPlaceholder({ fitClass = 'florence-fit', ar = '3 / 4' }) {
  return (
    <div className={`${fitClass} wall-placeholder relative`} style={{ aspectRatio: ar }} data-placeholder="true" aria-hidden>
      <svg viewBox="0 0 48 48" fill="none" width="40" height="40" style={{ opacity: 0.5 }}>
        <rect x="4" y="10" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="33" cy="18" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 32 l10-10 a2 2 0 0 1 2.8 0l8 8 a2 2 0 0 0 2.8 0l4-4 a2 2 0 0 1 2.8 0L44 34" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// An image whose box is height-driven: it fills its parent's height and its width
// follows the image's real aspect ratio (measured on load, with a fallback so the
// column doesn't collapse before the image loads). This avoids the flexbox
// intrinsic-width leak that otherwise leaves big gaps between height-sized photos.
export function FitImg({ img, index, onImageClick, fitClass = 'florence-fit' }) {
  const boxRef = useRef(null)
  const imgRef = useRef(null)
  const url = getImageRefUrl(img) || img.url || img
  const ar = img?.aspectRatio || (img?.width && img?.height ? img.width / img.height : null)
  // Set the box's aspect from the image's real dimensions. onLoad covers images that
  // load after mount (lazy / below-fold); the effect covers ones already complete by
  // hydration (SSR), where onLoad never fires.
  const applyAspect = () => {
    const im = imgRef.current
    if (boxRef.current && im && im.naturalWidth) boxRef.current.style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`
  }
  useEffect(() => { applyAspect() }) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`${fitClass} relative group`} ref={boxRef} style={{ aspectRatio: ar || '3 / 4' }}>
      <img
        ref={imgRef}
        src={getSizedUrl(url, 'display')}
        alt={img?.caption || 'Photo'}
        loading="lazy"
        onLoad={applyAspect}
        onClick={() => onImageClick?.(index)}
      />
      <Overlays url={url} print={img?.print} />
    </div>
  )
}
