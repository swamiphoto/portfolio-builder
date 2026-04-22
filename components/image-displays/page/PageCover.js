// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

function CtaButton({ button }) {
  if (!button?.label) return null
  const href = button.href || '#'
  const isExternal = href.startsWith('http')
  const base = 'inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors'
  const style = button.style === 'solid'
    ? 'bg-white text-stone-900 hover:bg-stone-100'
    : 'border border-white text-white hover:bg-white/10'
  return (
    <a
      href={href}
      className={`${base} ${style}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {button.label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'

  const customButtons = cover.buttons || []
  const hasSolid = customButtons.some(b => b.style === 'solid')

  const autoButtons = []
  if (slideshowHref) {
    autoButtons.push({ label: 'Start Slideshow', href: slideshowHref, style: hasSolid ? 'outline' : 'solid' })
  }
  if (clientFeaturesEnabled) {
    const firstAutoIsSolid = autoButtons.some(b => b.style === 'solid')
    autoButtons.push({ label: 'Client Login', href: '#client-login', style: (hasSolid || firstAutoIsSolid) ? 'outline' : 'solid' })
  }

  const allButtons = [...customButtons, ...autoButtons].filter(b => b.label)

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
          {allButtons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {allButtons.map((btn, i) => <CtaButton key={i} button={btn} />)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
