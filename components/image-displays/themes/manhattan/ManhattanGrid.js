// components/image-displays/themes/manhattan/ManhattanGrid.js
// Manhattan gallery-wall: a sharp-cornered masonry (CSS columns) that preserves
// each image's aspect ratio and reveals its caption inside on hover.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'
import { captionStyleCss } from '../../../../common/captionStyles'
import HoverCaption from '../../gallery/HoverCaption'

export default function ManhattanGrid({ images = [], onImageClick, captionStyle = 'sans' }) {
  return (
    <div className="manhattan-grid" style={{ columnGap: '1rem' }}>
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url || img
        const caption = img.caption || ''
        return (
          // The wrapper (not the button) carries breakInside so photo + caption
          // never split across masonry columns; the caption lives OUTSIDE the
          // button so it sits on the page ground, not the tile's bg-black/5 tint,
          // and stays out of the button's accessible name.
          <div key={i} className="mb-4" style={{ breakInside: 'avoid' }}>
            <button
              type="button"
              className="relative group block w-full overflow-hidden bg-black/5"
              onClick={() => onImageClick?.(i)}
            >
              <img
                src={getSizedUrl(url, 'display')}
                alt={caption || 'Photo'}
                loading="lazy"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
              />
              <HoverCaption caption={caption} captionStyle={captionStyle} />
            </button>
            {/* Mobile: caption beneath the photo (no hover on touch) */}
            {caption && (
              <span data-mobile-caption className="min-[769px]:hidden block mt-2 px-1 text-[13px] italic text-center text-gray-500" style={captionStyleCss(captionStyle)}>
                {caption}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
