// components/image-displays/page/PageCover.js
import { useState, useEffect } from 'react'
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

// Multiple cover images cross-fade into each other (a slow ~6s dwell, 1.4s fade).
// One image renders as a plain <img>; the deps key on the set length so editing the
// set restarts the timer without thrashing on unrelated re-renders.
function CoverMedia({ images, alt }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!images || images.length < 2) return undefined
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 6000)
    return () => clearInterval(t)
  }, [images.length])
  if (!images || !images.length) return null
  if (images.length === 1) {
    return <img src={getSizedUrl(images[0], 'display') || images[0]} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
  }
  return (
    <>
      {images.map((src, i) => (
        <img key={`${src}-${i}`} src={getSizedUrl(src, 'display') || src} alt={i === 0 ? alt : ''} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: i === idx ? 1 : 0, transition: 'opacity 1400ms ease-in-out' }} />
      ))}
    </>
  )
}

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}
// On the Split/Minimal layouts the CTA sits on a warm light panel, so the solid
// button flips to dark-on-panel (a white button would vanish).
const BUTTON_STYLE_MAP_LIGHT = {
  solid: 'bg-stone-900 text-white hover:bg-stone-800',
  outline: 'border border-stone-800 text-stone-900 hover:bg-black/5',
}

function CtaButton({ label, href, onClick, style, fullWidth, fontFamily, lightSurface }) {
  if (!label) return null
  const size = fullWidth ? 'w-full justify-center px-6 py-4 text-lg' : 'px-9 py-4 text-lg md:text-xl'
  const map = lightSurface ? BUTTON_STYLE_MAP_LIGHT : BUTTON_STYLE_MAP
  const cls = `inline-flex items-center ${size} font-medium transition-colors ${map[style] || map.solid}`
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
  // A cover can carry a set of images that cross-fade; falls back to the single
  // imageUrl. The first image is the primary (used for share thumbnails elsewhere).
  const coverImages = (cover?.images && cover.images.length) ? cover.images.filter(Boolean) : (cover?.imageUrl ? [cover.imageUrl] : [])
  const hasImage = coverImages.length > 0
  if (!cover || (!hasImage && !isCoverContext)) return null
  const isFull = cover.height === 'full'
  const heightClass = isFull ? 'h-screen' : 'h-[60vh]'
  const primaryStyle = cover.buttonStyle === 'outline' ? 'outline' : 'solid'
  const secondaryStyle = secondaryButtonStyle(primaryStyle)
  const scrim = OVERLAY_SCRIM[cover.overlay] || OVERLAY_SCRIM.medium
  const layout = ['bottom', 'split', 'minimal'].includes(cover.layout) ? cover.layout : 'centered'
  const isBottom = layout === 'bottom'
  const isSplit = layout === 'split'
  const isMinimal = layout === 'minimal'
  // Split/Minimal set type on a warm light panel (dark text); Centered/Bottom set it
  // over the photo (white text). Colors come from the theme when available.
  const lightSurface = isSplit || isMinimal
  const textStyle = { color: lightSurface ? 'var(--theme-text, #2c2416)' : '#fff' }
  const panelBg = 'var(--theme-bg, #f4f1ea)'
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

  // The heading/description/nav/CTA group, shared by every layout. `left` left-aligns
  // it (Bottom / Split); otherwise it's centered.
  const contentGroup = (left) => (
    <>
      {(useLogo || brandText || description) && (
        <div className={`space-y-4 mb-9 ${left ? '' : 'mx-auto'}`}>
          {useLogo
            ? <img src={logo} alt={siteName || ''} style={{ height: LOGO_HEIGHT[cover.logoSize] || LOGO_HEIGHT.medium, width: 'auto', filter: logoFilter, ...(left ? {} : { margin: '0 auto' }) }} />
            : brandText && <h2 className="text-4xl md:text-6xl font-light tracking-tight" style={{ ...textStyle, ...(titleFontFamily ? { fontFamily: titleFontFamily } : {}) }}>{brandText}</h2>}
          {description && (
            <p className={`text-lg md:text-2xl leading-relaxed max-w-2xl ${left ? '' : 'mx-auto'}`} style={{ ...textStyle, ...(descriptionFontFamily ? { fontFamily: descriptionFontFamily } : {}) }}>
              <InlineMarkdown text={description} />
            </p>
          )}
        </div>
      )}
      {navLinks.length > 0 && (
        <nav className={`flex flex-wrap items-center gap-6 mb-8 ${left ? 'justify-start' : 'justify-center'}`} style={textStyle}>
          {navLinks.map((l, i) => (
            <a key={i} href={l.href} className="text-sm opacity-80 hover:opacity-100 transition-opacity">{l.label}</a>
          ))}
        </nav>
      )}
      {buttons.length > 0 && (
        <div className={isMobile ? 'flex flex-col items-stretch gap-3 w-full' : `flex flex-wrap items-center gap-3 ${left ? 'justify-start' : 'justify-center'}`}>
          {buttons.map((btn, i) => (
            <CtaButton key={i} label={btn.label} href={btn.href} onClick={btn.onClick} style={i === 0 ? primaryStyle : secondaryStyle} fullWidth={isMobile} fontFamily={buttonFontFamily} lightSurface={lightSurface} />
          ))}
        </div>
      )}
    </>
  )

  // Minimal: no photo — the type sits centered on a warm color field.
  if (isMinimal) {
    return (
      <section className={`relative w-full ${heightClass} overflow-hidden`} style={{ background: panelBg }}>
        <div className="relative z-10 flex flex-col h-full items-center justify-center text-center px-6">{contentGroup(false)}</div>
      </section>
    )
  }

  // Split: photo on one half, the type on a warm panel on the other (stacks on phones).
  if (isSplit) {
    return (
      <section className={`relative w-full ${heightClass} overflow-hidden flex flex-col md:flex-row`}>
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full overflow-hidden" style={{ background: panelBg }}>
          {hasImage && <CoverMedia images={coverImages} alt={cover.overlayText || brandText || ''} />}
        </div>
        <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col justify-center px-8 md:px-[5vw] py-10" style={{ background: panelBg }}>{contentGroup(true)}</div>
      </section>
    )
  }

  // Centered / Bottom: full-bleed photo with a scrim; type over it in white.
  const align = isBottom ? 'items-start justify-end text-left' : 'items-center justify-center text-center'
  const pad = isBottom ? 'px-8 md:px-[6vw] pb-[9vh]' : 'px-6'
  return (
    <section
      className={`relative w-full ${heightClass} overflow-hidden`}
      style={hasImage ? undefined : { background: COVER_FALLBACK_BG }}
    >
      {hasImage && (
        <>
          <CoverMedia images={coverImages} alt={cover.overlayText || brandText || ''} />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${scrim.base})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${scrim.grad}), rgba(0,0,0,0) 62%)` }} />
        </>
      )}
      <div className={`relative z-10 flex flex-col h-full ${align} ${pad}`}>{contentGroup(isBottom)}</div>
    </section>
  )
}
