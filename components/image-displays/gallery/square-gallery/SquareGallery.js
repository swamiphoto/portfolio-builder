import { getImageRefUrl, focalPointToObjectPosition } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'
import { useIsMobile } from '../../../../common/useIsMobile'
import EngagementActions from '../../engagement/EngagementActions'
import WatermarkOverlay from '../../engagement/WatermarkOverlay'

// The Size control drives tile size directly via column count (large 2 / medium 3
// / small 4). Cap at the image count (no empty columns) and at 2 on small screens.
export default function SquareGallery({ images = [], onImageClick, maxCols = 3, bleed = false }) {
  const isSmall = useIsMobile()
  const target = isSmall ? Math.min(2, maxCols) : maxCols
  const cols = Math.max(1, Math.min(target, images.length))

  return (
    <div className={`w-full ${bleed ? '' : 'max-w-6xl mx-auto px-4 md:px-8'}`}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {images.map((img, i) => {
          const rawUrl = getImageRefUrl(img) || img.url || ''
          const src = getSizedUrl(rawUrl, 'display') || rawUrl
          return (
            <div
              key={i}
              data-square-item
              className="relative group aspect-square overflow-hidden rounded-2xl shadow cursor-pointer"
              onClick={() => onImageClick?.(i)}
            >
              <img
                src={src || undefined}
                alt={img.caption || ''}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: focalPointToObjectPosition(img.focalPoint) }}
              />
              <WatermarkOverlay />
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
                <EngagementActions imageUrl={rawUrl} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
