// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'
import { secondaryButtonStyle } from '../../../common/coverButtons'
import { useClientEngagement } from '../engagement/ClientEngagementContext'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}

function CtaButton({ label, href, onClick, style }) {
  if (!label) return null
  const cls = `inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`
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

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [] }) {
  const ctx = useClientEngagement()
  if (!cover || !cover.imageUrl) return null
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
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'display') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
        {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-6">{description}</p>}
        {navLinks.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} className="text-sm text-white/90 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {buttons.map((btn, i) => (
              <CtaButton key={i} label={btn.label} href={btn.href} onClick={btn.onClick} style={i === 0 ? primaryStyle : secondaryStyle} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
