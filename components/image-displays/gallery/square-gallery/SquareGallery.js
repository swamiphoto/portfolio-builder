import { useMediaQuery } from 'react-responsive'
import { getImageRefUrl, focalPointToObjectPosition } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

// The Size control drives tile size directly via column count (large 2 / medium 3
// / small 4). Cap at the image count (no empty columns) and at 2 on small screens.
export default function SquareGallery({ images = [], onImageClick, maxCols = 3 }) {
  const isSmall = useMediaQuery({ maxWidth: 767 })
  const target = isSmall ? Math.min(2, maxCols) : maxCols
  const cols = Math.max(1, Math.min(target, images.length))

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
