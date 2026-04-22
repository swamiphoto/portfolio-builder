// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
  ghost: 'text-white hover:bg-white/10',
}

function CtaButton({ label, href, style }) {
  if (!label) return null
  const isExternal = href?.startsWith('http')
  return (
    <a
      href={href || '#'}
      className={`inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'
  const buttonStyle = cover.buttonStyle || 'solid'

  const buttons = []
  if (slideshowHref) {
    buttons.push({ label: 'Start Slideshow', href: slideshowHref })
  }
  if (clientFeaturesEnabled) {
    buttons.push({ label: 'Client Login', href: '#client-login' })
  }

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
          {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
          {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-8">{description}</p>}
          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {buttons.map((btn, i) => (
                <CtaButton key={i} label={btn.label} href={btn.href} style={buttonStyle} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
