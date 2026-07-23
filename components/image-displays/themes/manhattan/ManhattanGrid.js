// components/image-displays/themes/manhattan/ManhattanGrid.js
// Manhattan gallery-wall: a sharp-cornered masonry (CSS columns) that preserves
// each image's aspect ratio and reveals its caption inside on hover.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'
import HoverCaption from '../../gallery/HoverCaption'

export default function ManhattanGrid({ images = [], onImageClick, captionStyle = 'sans' }) {
  return (
    <div className="manhattan-grid" style={{ columnGap: '1rem', columnCount: 2 }}>
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url || img
        const caption = img.caption || ''
        return (
          <button
            key={i}
            type="button"
            className="relative group block w-full mb-4 overflow-hidden bg-black/5"
            onClick={() => onImageClick?.(i)}
            style={{ breakInside: 'avoid' }}
          >
            <img
              src={getSizedUrl(url, 'display')}
              alt={caption || 'Photo'}
              loading="lazy"
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
            />
            <HoverCaption caption={caption} captionStyle={captionStyle} />
          </button>
        )
      })}
    </div>
  )
}
