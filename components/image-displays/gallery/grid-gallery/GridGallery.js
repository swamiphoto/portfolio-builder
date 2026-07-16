// GridGallery.js — Justified flex-wrap rows (Flickr / 500px style)
// Each item's flex-grow = aspect ratio so a row settles to a common height
// and portraits (aspect < 1) take less width than landscapes.
//
// Aspect-loading seam:
//   1. Initialise each item's aspect from explicit width/height props (if present)
//      so tests passing dims get correct flex-grow synchronously (jsdom never
//      fires Image.onload).
//   2. In useEffect, fire new window.Image() for each URL to refine the aspect
//      once the image actually loads in the browser.  Prod refs have no
//      width/height, so they start at the fallback (1.5) and refine on load.
import { useEffect, useState } from 'react'
import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

const FALLBACK_ASPECT = 1.5

function initialAspect(img) {
  const w = img.width || img.w
  const h = img.height || img.h
  if (w && h) return w / h
  return FALLBACK_ASPECT
}

export default function GridGallery({ images = [], onImageClick }) {
  // aspects: array of floats, one per image, parallel to `images`
  const [aspects, setAspects] = useState(() => images.map(initialAspect))

  useEffect(() => {
    // Reset synchronous aspects whenever images array changes
    setAspects(images.map(initialAspect))

    if (typeof window === 'undefined') return

    images.forEach((imgRef, i) => {
      const rawUrl = getImageRefUrl(imgRef) || imgRef.url || ''
      if (!rawUrl) return
      const src = getSizedUrl(rawUrl, 'display') || rawUrl
      const domImg = new window.Image()
      domImg.onload = () => {
        const ar = domImg.width && domImg.height
          ? domImg.width / domImg.height
          : FALLBACK_ASPECT
        setAspects((prev) => {
          const next = [...prev]
          next[i] = ar
          return next
        })
      }
      domImg.onerror = () => {
        setAspects((prev) => {
          const next = [...prev]
          next[i] = FALLBACK_ASPECT
          return next
        })
      }
      domImg.src = src
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.map((img) => getImageRefUrl(img) || img.url || '').join('|')])

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
      <div className="flex flex-wrap gap-3">
        {images.map((imgRef, i) => {
          const ar = aspects[i] ?? FALLBACK_ASPECT
          const rawUrl = getImageRefUrl(imgRef) || imgRef.url || ''
          const src = getSizedUrl(rawUrl, 'display') || rawUrl
          return (
            <div
              key={i}
              data-grid-item
              style={{
                flexGrow: ar,
                flexBasis: `${ar * 220}px`,
              }}
              className="relative overflow-hidden rounded-2xl shadow cursor-pointer"
              onClick={() => onImageClick?.(i)}
            >
              {/* Intrinsic-ratio spacer so height is driven by flex row settling */}
              <div style={{ paddingBottom: `${(1 / ar) * 100}%` }} />
              <img
                src={src || undefined}
                alt={imgRef.caption || ''}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
