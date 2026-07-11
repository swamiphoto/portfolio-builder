// components/image-displays/themes/manhattan/ManhattanGrid.js
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'

export default function ManhattanGrid({ images = [], onImageClick }) {
  return (
    <div className="manhattan-grid grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url || img
        return (
          <button
            key={i}
            type="button"
            className="block w-full overflow-hidden bg-black/5"
            onClick={() => onImageClick?.(i)}
            style={{ aspectRatio: '1 / 1' }}
          >
            <img
              src={getSizedUrl(url, 'display')}
              alt={img.caption || 'Photo'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03] cursor-pointer"
            />
          </button>
        )
      })}
    </div>
  )
}
