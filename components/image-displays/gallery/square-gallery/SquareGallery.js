import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

export default function SquareGallery({ images = [], onImageClick }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
