// components/image-displays/gallery/photo-block/ManhattanPhoto.js
// Manhattan single photo: one rendering, no layout options. Spans the full
// content width (same span as every other block — height varies by aspect),
// sharp corners, caption inside on hover.
import { getSizedUrl } from '../../../../common/imageUtils'
import { captionStyleCss } from '../../../../common/captionStyles'
import HoverCaption from '../HoverCaption'
import WatermarkOverlay from '../../engagement/WatermarkOverlay'
import BuyPrintButton from '../../print/BuyPrintButton'
import EngagementActions from '../../engagement/EngagementActions'

export default function ManhattanPhoto({ imageUrl, caption = '', onImageClick, captionStyle = 'sans', print }) {
  return (
    <figure className="manhattan-photo w-full">
      <div className="relative group">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || 'Photo'}
          loading="lazy"
          className="w-full h-auto object-cover cursor-pointer"
          onClick={() => onImageClick?.(0)}
        />
        <WatermarkOverlay />
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <BuyPrintButton print={print} imageUrl={imageUrl} />
        </div>
        <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
          <EngagementActions imageUrl={imageUrl} />
        </div>
        <HoverCaption caption={caption} captionStyle={captionStyle} />
      </div>
      {/* Mobile: no hover exists, and an overlay would cover the photo — the
          caption sits beneath instead (HoverCaption is hidden below md). */}
      {caption && (
        <figcaption data-mobile-caption className="min-[769px]:hidden mt-2 text-[14px] italic text-center text-gray-500 max-w-md mx-auto" style={captionStyleCss(captionStyle)}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
