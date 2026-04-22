// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

function CtaButton({ cta, variant }) {
  if (!cta?.label) return null
  const href = cta.href || '#'
  const base = 'inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors'
  const style = variant === 'primary'
    ? 'bg-white text-stone-900 hover:bg-stone-100'
    : 'border border-white text-white hover:bg-white/10'
  return (
    <a href={href} className={`${base} ${style}`}>
      {cta.label}
    </a>
  )
}

export default function PageCover({ cover, title, description }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {isCover && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      {isCover && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          {title && <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h1>}
          {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-8">{description}</p>}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CtaButton cta={cover.primaryCta} variant="primary" />
            <CtaButton cta={cover.secondaryCta} variant="secondary" />
          </div>
        </div>
      )}
    </section>
  )
}
