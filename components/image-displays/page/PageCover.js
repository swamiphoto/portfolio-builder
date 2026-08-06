// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'
import { secondaryButtonStyle } from '../../../common/coverButtons'
import { COVER_FALLBACK_BG } from '../../../common/coverBackground'
import { useClientEngagement } from '../engagement/ClientEngagementContext'
import ManhattanHero from './ManhattanHero'
import ProvenceCover from './ProvenceCover'
import { useIsMobile } from '../../../common/useIsMobile'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}

function CtaButton({ label, href, onClick, style, fullWidth }) {
  if (!label) return null
  const size = fullWidth ? 'w-full justify-center px-5 py-3 text-base' : 'px-5 py-2.5 text-sm'
  const cls = `inline-flex items-center ${size} font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`
  if (onClick) {
    return <button type="button" onClick={onClick} className={cls}>{label}</button>
  }
  const isExternal = href?.startsWith('http')
  return (
    <a href={href || '#'} className={cls} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [], themeId, siteName }) {
  const ctx = useClientEngagement()
  const isMobile = useIsMobile()
  if (themeId === 'manhattan') {
    return <ManhattanHero title={title} description={description} slideshowHref={slideshowHref} />
  }
  if (themeId === 'provence') {
    if (!cover || !cover.imageUrl) return null
    const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)
    // View Gallery (scrolls into the grid) is always first; Music Show and
    // Packages (outline) light up when available.
    const btns = [{ label: 'View Gallery', style: 'solid' }]
    if (slideshowHref) btns.push({ label: 'View Music Show', href: slideshowHref, style: 'solid' })
    if (showPackages) btns.push({ label: 'View Packages', onClick: () => ctx?.openPurchase?.(), style: 'outline' })
    return (
      <ProvenceCover
        eyebrow={siteName}
        title={title}
        description={description}
        imageUrl={cover.imageUrl}
        buttons={btns}
      />
    )
  }
  // A cover page ('cover' variant) still renders a hero even with no photo yet —
  // over a warm color blend instead of a blank panel. Inner pages with no cover
  // image render nothing, as before.
  const isCoverContext = cover?.variant === 'cover'
  const hasImage = !!cover?.imageUrl
  if (!cover || (!hasImage && !isCoverContext)) return null
  const isFull = cover.height === 'full'
  const heightClass = isFull ? 'h-screen' : 'h-[60vh]'
  const primaryStyle = cover.buttonStyle === 'outline' ? 'outline' : 'solid'
  const secondaryStyle = secondaryButtonStyle(primaryStyle)

  // Context-driven: live gates on connected payouts; the editor preview supplies
  // a lightweight PreviewPackagesProvider so this lights up while editing too.
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (primaryButton?.label) buttons.push(primaryButton)
  if (slideshowHref) buttons.push({ label: 'View Music Show', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'View Packages', onClick: () => ctx?.openPurchase?.() })
  if (clientFeaturesEnabled) buttons.push({ label: 'Client Login', href: '#client-login' })

  return (
    <section
      className={`relative w-full ${heightClass} overflow-hidden`}
      style={hasImage ? undefined : { background: COVER_FALLBACK_BG }}
    >
      {hasImage && (
        <>
          <img
            src={getSizedUrl(cover.imageUrl, 'display') || cover.imageUrl}
            alt={cover.overlayText || title || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </>
      )}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        {/* Title + description as one group, with a fixed gap before the CTA — so
            the button never hugs the name when there's no description. */}
        {(title || description) && (
          <div className="space-y-3 mb-9">
            {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight">{title}</h2>}
            {description && <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">{description}</p>}
          </div>
        )}
        {navLinks.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} className="text-sm text-white/90 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {buttons.length > 0 && (
          <div className={isMobile ? 'flex flex-col items-stretch gap-3 w-full' : 'flex flex-wrap items-center justify-center gap-3'}>
            {buttons.map((btn, i) => (
              <CtaButton key={i} label={btn.label} href={btn.href} onClick={btn.onClick} style={i === 0 ? primaryStyle : secondaryStyle} fullWidth={isMobile} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
