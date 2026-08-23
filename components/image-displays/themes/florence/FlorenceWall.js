// components/image-displays/themes/florence/FlorenceWall.js
// The Florence horizontal museum wall. A thin fixed rail (logo · hamburger · search)
// beside a horizontally-scrolling row of columns (intro + one per block), split by
// vertical hairlines. The hamburger slides a menu column in at the front, pushing
// the wall right. Wheel + drag + arrows all pan horizontally, except over a
// multi-photo column that still has room to scroll vertically. On phones the whole
// thing collapses to a vertical stack (CSS, via data-mobile).
import { useRef, useState } from 'react'
import { buildNavTree } from '../../../../common/pagesTree'
import FlorenceColumn from './FlorenceColumn'
import MobileNavOverlay from '../../page/MobileNavOverlay'
import useWallScroll from '../shared/useWallScroll'

const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website']

function IconMenu() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M3 6h14M3 12h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IconClose() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IconArrow({ dir }) {
  const d = dir === 'prev' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'
  return <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden><path d={d} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function navItemActive(item, currentPageId, basePath, currentPath) {
  const selfActive = currentPageId != null
    ? item.id === currentPageId
    : currentPath === `${basePath}/${item.slug || item.id}`
  if (selfActive) return true
  return (item.children || []).some(c => navItemActive(c, currentPageId, basePath, currentPath))
}

export default function FlorenceWall({
  siteConfig = {}, name, description, blocks = [], basePath = '', makeClickHandler,
  onBlockHover, onBlockClick, mobile = false, actions = [],
  currentPageId, onPageClick, currentPath = '', photoMeta = 'off', pages = [],
  childPages = [], activeChildId = null, onChildPageClick, showPlaceholders = false, cover = null,
}) {
  // Sub-links can sit above the museum title (a horizontal row) or below it (default).
  const linksAbove = cover?.linksPosition === 'above'
  const wallRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const { onPointerDown, onPointerMove, endDrag, page } = useWallScroll({ wallRef, mobile, columnSelector: '.florence-col' })

  const tree = buildNavTree(siteConfig.pages || [], { respectHideChildren: true }).filter(i => i.showInNav !== false)
  const socials = siteConfig.contact || {}
  const socialKeys = SOCIAL_KEYS.filter(k => socials[k])

  // Nested pages of the page being viewed (the sub-nav set), shown as links under
  // its description in the mono voice.
  const renderChildLink = (p) => {
    const isLink = p.type === 'link'
    const href = isLink ? (p.url || '#') : `${basePath}/${p.slug || p.id}`
    const cls = `florence-intro__childlink${p.id === activeChildId ? ' is-active' : ''}`
    if (onChildPageClick && !isLink) {
      return <button key={p.id} type="button" className={cls} onClick={() => onChildPageClick(p.id)}>{p.title}</button>
    }
    return <a key={p.id} className={cls} href={href} {...(isLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{p.title}</a>
  }

  const logoImage = siteConfig?.logoType === 'image' && siteConfig?.logo
  const brand = logoImage
    ? <img src={siteConfig.logo} alt={siteConfig.siteName || 'Logo'} />
    : (siteConfig.siteName || name || '')
  // Logo-bar rail layout: 1 = wordmark up the rail (default), 2 = rotated
  // CCW with the menu on top, 3 = centered upright with the menu on top.
  const logoBar = ['1', '2', '3'].includes(siteConfig?.design?.logoBarLayout) ? siteConfig.design.logoBarLayout : '1'

  const toggleMenu = () => {
    setMenuOpen(o => {
      const next = !o
      if (next && wallRef.current) wallRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      return next
    })
  }

  const renderLink = (item) => {
    const isLink = item.type === 'link'
    const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
    const active = navItemActive(item, currentPageId, basePath, currentPath)
    const cls = `florence-menu__link${active ? ' is-active' : ''}`
    if (onPageClick && !isLink) {
      return <button className={cls} onClick={() => { onPageClick(item.id); setMenuOpen(false) }}>{item.title}</button>
    }
    return <a className={cls} href={href} {...(isLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.title}</a>
  }

  return (
    <div className="florence-stage" data-mobile={mobile ? 'true' : 'false'}>
      <nav className="florence-rail" data-logobar={logoBar} aria-label="Site navigation">
        {onPageClick
          ? <button className="florence-rail__logo" data-orient="vertical" onClick={() => onPageClick(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{brand}</button>
          : <a className="florence-rail__logo" data-orient="vertical" href={basePath || '/'}>{brand}</a>}
        <div className="florence-rail__mid">
          <button className="florence-rail__btn" onClick={toggleMenu} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        <span className="florence-rail__spacer" aria-hidden />
      </nav>

      <div
        className="florence-wall"
        ref={wallRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* Desktop: the menu slides in as a column at the front of the wall. On
            phones we use the shared full-screen overlay instead (below). */}
        {!mobile && (
          <section className="florence-menu" data-open={menuOpen ? 'true' : 'false'} aria-hidden={!menuOpen}>
            <div className="florence-menu__inner">
              <ul className="florence-menu__list">
                {tree.map(item => <li key={item.id}>{renderLink(item)}</li>)}
              </ul>
              {socialKeys.length > 0 && (
                <div className="florence-menu__socials">
                  {socialKeys.map(k => {
                    const v = socials[k]
                    const href = v?.startsWith?.('http') ? v : `https://${k}.com/${String(v).replace(/^@/, '')}`
                    return <a key={k} className="florence-menu__social" href={href} target="_blank" rel="noopener noreferrer">{k}</a>
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="florence-col florence-col--intro">
          {linksAbove && childPages.length > 0 && (
            <nav className="florence-intro__children florence-intro__children--above" aria-label="Pages in this section">
              {childPages.map(renderChildLink)}
            </nav>
          )}
          {name && <h1 className="florence-intro__title">{name}</h1>}
          {description && <p className="florence-intro__desc">{description}</p>}
          {!linksAbove && childPages.length > 0 && (
            <nav className="florence-intro__children" aria-label="Pages in this section">
              {childPages.map(renderChildLink)}
            </nav>
          )}
          {actions.length > 0 && (
            <div className="florence-intro__actions">
              {actions.map((a, i) => (
                <button key={i} type="button" onClick={a.onClick} className={`florence-intro__btn${a.style === 'outline' ? ' florence-intro__btn--outline' : ''}`}>{a.label}</button>
              ))}
            </div>
          )}
        </section>

        {blocks.map((block, index) => (
          <FlorenceColumn
            key={`col-${index}`}
            block={block}
            blockIndex={index}
            photoMeta={photoMeta}
            siteConfig={siteConfig}
            pages={pages}
            basePath={basePath}
            showPlaceholders={showPlaceholders}
            onImageClick={makeClickHandler ? makeClickHandler(index) : undefined}
            hoverProps={{
              ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
              ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
            }}
          />
        ))}
      </div>

      {!mobile && (
        <div className="florence-arrows">
          <button className="florence-arrows__btn" onClick={() => page('prev')} aria-label="Previous"><IconArrow dir="prev" /></button>
          <button className="florence-arrows__btn" onClick={() => page('next')} aria-label="Next"><IconArrow dir="next" /></button>
        </div>
      )}

      {/* Phone: standardized full-screen page menu (page links only — no socials). */}
      {mobile && (
        <MobileNavOverlay
          open={menuOpen} onClose={() => setMenuOpen(false)} tree={tree} basePath={basePath}
          currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick}
          linkClassName="font-fraunces"
          overlayStyle={{ background: 'var(--theme-bg, #f4f1ea)', color: 'var(--theme-text, #1c1a17)' }}
        />
      )}
    </div>
  )
}
