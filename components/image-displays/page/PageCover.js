// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

export default function PageCover({ cover, title }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const overlay = cover.overlayText || title || ''
  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={overlay}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-white text-3xl md:text-5xl font-light tracking-wide drop-shadow-lg text-center px-6">{overlay}</h1>
        </div>
      )}
    </section>
  )
}
