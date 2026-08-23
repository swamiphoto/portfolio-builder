// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'
import { secondaryButtonStyle } from '../../../common/coverButtons'
import { COVER_FALLBACK_BG } from '../../../common/coverBackground'
import { useClientEngagement } from '../engagement/ClientEngagementContext'
import ManhattanHero from './ManhattanHero'
import ProvenceCover from './ProvenceCover'
import { useIsMobile } from '../../../common/useIsMobile'
import { parseMarkdown } from '../../../common/markdown'
import { renderInline } from '../MarkdownText'

// The cover description supports inline emphasis + links (bold / italic / links),
// no block elements — just enough to bold or link a few words like a real bio.
function InlineMarkdown({ text }) {
  if (!text) return null
  const ast = parseMarkdown(String(text))
  const nodes = ast.flatMap((b) => b.children || (b.value != null ? [{ type: 'text', value: b.value }] : []))
  return <>{renderInline(nodes)}</>
}

// Layered scrim (even base + bottom gradient) so text stays legible on any photo;
// the Overlay control (Light / Medium / Dark) scales both layers.
const OVERLAY_SCRIM = {
  light: { base: 0.14, grad: 0.42 },
  medium: { base: 0.26, grad: 0.58 },
  dark: { base: 0.42, grad: 0.74 },
}
const LOGO_HEIGHT = { small: 'clamp(34px, 4.5vw, 48px)', medium: 'clamp(48px, 6.5vw, 84px)', large: 'clamp(68px, 9vw, 128px)' }

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}

function CtaButton({ label, href, onClick, style, fullWidth, fontFamily }) {
  if (!label) return null
  const size = fullWidth ? 'w-full justify-center px-6 py-4 text-lg' : 'px-9 py-3.5 text-base md:text-lg'
  const cls = `inline-flex items-center ${size} font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`
  const st = fontFamily ? { fontFamily } : undefined
  if (onClick) {
    return <button type="button" onClick={onClick} className={cls} style={st}>{label}</button>
  }
  const isExternal = href?.startsWith('http')
  return (
    <a href={href || '#'} className={cls} style={st} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [], themeId, siteName, titleFontFamily, descriptionFontFamily, buttonFontFamily, logo }) {
  const ctx = useClientEngagement()
  const isMobile = useIsMobile()
  if (themeId === 'manhattan') {
    return <ManhattanHero title={title} description={description} slideshowHref={slideshowHref} />
  }
  // Florence renders its museum header (name on paper) via GalleryCover, so it
  // never shows an image hero — the works themselves lead.
  if (themeId === 'florence') {
    return null
  }
  // Amsterdam renders its own opener inside AmsterdamWall (poster hero / title
  // panel), so the page-level cover never shows.
  if (themeId === 'amsterdam') {
    return null
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
  const scrim = OVERLAY_SCRIM[cover.overlay] || OVERLAY_SCRIM.medium
  const isBottom = cover.layout === 'bottom'
  // Brand mark: the site logo (when set and the cover has no explicit heading of its
  // own) or the heading text. A logo carries the brand, so it wins over the fallback
  // site name — but an explicit cover heading still overrides the logo.
  const useLogo = !cover.heading && !!logo
  const brandText = useLogo ? '' : (cover.heading || (typeof title === 'string' ? title : '') || siteName || '')
  const logoFilter = cover.logoColor === 'light' ? 'brightness(0) invert(1)' : cover.logoColor === 'dark' ? 'brightness(0)' : undefined

  // Context-driven: live gates on connected payouts; the editor preview supplies
  // a lightweight PreviewPackagesProvider so this lights up while editing too.
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (primaryButton?.label) buttons.push(primaryButton)
  if (slideshowHref) buttons.push({ label: 'View Music Show', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'View Packages', onClick: () => ctx?.openPurchase?.() })
  if (clientFeaturesEnabled) buttons.push({ label: 'Client Login', href: '#client-login' })

  // Layout: 'centered' (middle) or 'bottom' (anchored lower-left, editorial).
  const align = isBottom ? 'items-start justify-end text-left' : 'items-center justify-center text-center'
  const pad = isBottom ? 'px-8 md:px-[6vw] pb-[9vh]' : 'px-6'
  const groupMax = isBottom ? '' : 'mx-auto'

  return (
    <section
      className={`relative w-full ${heightClass} overflow-hidden`}
      style={hasImage ? undefined : { background: COVER_FALLBACK_BG }}
    >
      {hasImage && (
        <>
          <img
            src={getSizedUrl(cover.imageUrl, 'display') || cover.imageUrl}
            alt={cover.overlayText || brandText || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${scrim.base})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${scrim.grad}), rgba(0,0,0,0) 62%)` }} />
        </>
      )}
      <div className={`relative z-10 flex flex-col h-full text-white ${align} ${pad}`}>
        {(useLogo || brandText || description) && (
          <div className={`space-y-4 mb-9 ${groupMax}`}>
            {useLogo
              ? <img src={logo} alt={siteName || ''} style={{ height: LOGO_HEIGHT[cover.logoSize] || LOGO_HEIGHT.medium, width: 'auto', filter: logoFilter, ...(isBottom ? {} : { margin: '0 auto' }) }} />
              : brandText && <h2 className="text-4xl md:text-6xl font-light tracking-tight" style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}>{brandText}</h2>}
            {description && (
              <p className={`text-lg md:text-2xl leading-relaxed text-white max-w-2xl ${isBottom ? '' : 'mx-auto'}`} style={descriptionFontFamily ? { fontFamily: descriptionFontFamily } : undefined}>
                <InlineMarkdown text={description} />
              </p>
            )}
          </div>
        )}
        {navLinks.length > 0 && (
          <nav className={`flex flex-wrap items-center gap-6 mb-8 ${isBottom ? 'justify-start' : 'justify-center'}`}>
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} className="text-sm text-white/90 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {buttons.length > 0 && (
          <div className={isMobile ? 'flex flex-col items-stretch gap-3 w-full' : `flex flex-wrap items-center gap-3 ${isBottom ? 'justify-start' : 'justify-center'}`}>
            {buttons.map((btn, i) => (
              <CtaButton key={i} label={btn.label} href={btn.href} onClick={btn.onClick} style={i === 0 ? primaryStyle : secondaryStyle} fullWidth={isMobile} fontFamily={buttonFontFamily} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
