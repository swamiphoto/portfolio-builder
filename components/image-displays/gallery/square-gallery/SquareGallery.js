import { useMediaQuery } from 'react-responsive'
import { getImageRefUrl, focalPointToObjectPosition } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

// Choose a column count that keeps the grid balanced instead of leaving a lonely
// last row. e.g. 4 images -> 2x2 (not 3+1), 6 -> 3x2, capped at 3 columns so tiles
// stay a reasonable size. On small screens we cap at 2.
function balancedColumns(n) {
  if (n <= 1) return 1
  if (n <= 3) return n
  if (n === 4) return 2
  return 3
}

export default function SquareGallery({ images = [], onImageClick }) {
  const isSmall = useMediaQuery({ maxWidth: 767 })
  const cols = Math.min(balancedColumns(images.length), isSmall ? 2 : 3)

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {images.map((img, i) => {
          const rawUrl = getImageRefUrl(img) || img.url || ''
          const src = getSizedUrl(rawUrl, 'display') || rawUrl
          return (
            <div
              key={i}
              data-square-item
              className="relative aspect-square overflow-hidden rounded-2xl shadow cursor-pointer"
              onClick={() => onImageClick?.(i)}
            >
              <img
                src={src || undefined}
                alt={img.caption || ''}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: focalPointToObjectPosition(img.focalPoint) }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
