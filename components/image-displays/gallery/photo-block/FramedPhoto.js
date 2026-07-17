// components/image-displays/gallery/photo-block/FramedPhoto.js
import { getSizedUrl } from '../../../../common/imageUtils'
import { captionStyleCss } from '../../../../common/captionStyles'

export default function FramedPhoto({ imageUrl, caption = '', onImageClick, captionStyle = 'sans' }) {
  return (
    <figure className="framed-photo mx-auto max-w-4xl w-full px-4 md:px-8 py-2">
      <div className="bg-white p-4 md:p-8 shadow-md">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || 'Photo'}
          loading="lazy"
          className="w-full h-auto object-contain cursor-pointer"
          onClick={() => onImageClick?.(0)}
        />
      </div>
      {caption && <figcaption className="mt-3 text-center text-sm italic" style={{ color: 'var(--theme-text-muted)', ...captionStyleCss(captionStyle) }}>{caption}</figcaption>}
    </figure>
  )
}
