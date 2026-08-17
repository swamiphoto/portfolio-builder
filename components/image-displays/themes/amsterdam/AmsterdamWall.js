// The Amsterdam horizontal poster wall. A thin fixed rail (wordmark · hamburger ·
// ink rule) beside a horizontally-scrolling row of columns: an opener (poster
// hero on the home page, Anton title panel on gallery pages), then one column
// per block. The hamburger slides an ink menu column in at the front. Wheel +
// drag + arrows pan horizontally via useWallScroll; on phones the wall collapses
// to a vertical stack (CSS, via data-mobile). Read-only: edits stay in the sidebar.
import { useRef, useState } from 'react'
import { buildNavTree } from '../../../../common/pagesTree'
import { amsterdamInkColors } from '../../../../common/themes/amsterdam'
import { resolveAmsterdamGround } from '../../../../common/themes/variants'
import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'
import useWallScroll from '../shared/useWallScroll'
import useWallChrome from './useWallChrome'
import AmsterdamColumn from './AmsterdamColumn'

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

export default function AmsterdamWall({
  siteConfig = {}, name, description, blocks = [], basePath = '', makeClickHandler,
  onBlockHover, onBlockClick, mobile = false, actions = [],
  currentPageId, onPageClick, currentPath = '', photoMeta = 'off', pages = [],
  cover = null, opener = 'title',
}) {
  const wallRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { onPointerDown, onPointerMove, endDrag, page } = useWallScroll({ wallRef, mobile, columnSelector: '.ams-col' })
  useWallChrome({ wallRef, mobile })

  const tree = buildNavTree(siteConfig.pages || [], { respectHideChildren: true }).filter(i => i.showInNav !== false)
  const socials = siteConfig.contact || {}
  const socialKeys = SOCIAL_KEYS.filter(k => socials[k])
  const inks = amsterdamInkColors(siteConfig?.design)

  const logoImage = siteConfig?.logoType === 'image' && siteConfig?.logo
  const brand = logoImage
    ? <img src={siteConfig.logo} alt={siteConfig.siteName || 'Logo'} />
    : (siteConfig.siteName || name || '')

  // Small uppercase-mono note at the foot of the rail: a tagline if set, else the
  // primary social handle — a quiet signature under the wordmark.
  const rawSocial = socialKeys.length ? socials[socialKeys[0]] : ''
  const footText = siteConfig?.tagline
    || (rawSocial ? `@${String(rawSocial).replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').replace(/\/$/, '')}` : '')

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
    const cls = `ams-menu__link${active ? ' is-active' : ''}`
    if (onPageClick && !isLink) {
      return <button className={cls} onClick={() => { onPageClick(item.id); setMenuOpen(false) }}>{item.title}</button>
    }
    return <a className={cls} href={href} {...(isLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.title}</a>
  }

  const coverUrl = getImageRefUrl(cover) || cover?.imageUrl
  const heroOpener = opener === 'hero' && !!coverUrl

  // De Stijl rhythm: the wall marches through black → white → red grounds, and
  // the rail floods to match whichever ground is centered. The opener sets the
  // downbeat (a photo hero reads as black; the title panel is red), then every
  // block takes the next ground in the cycle so no two neighbours share a color.
  const GROUND_ORDER = ['dark', 'light', 'ink']
  const openerSurface = heroOpener ? 'dark' : 'ink'
  const blockStart = (GROUND_ORDER.indexOf(openerSurface) + 1) % GROUND_ORDER.length
  // A block can pin its own ground (Color control); otherwise it takes the next
  // color in the rotation. Pinned blocks don't consume a rotation slot, so the
  // auto blocks around them keep alternating cleanly.
  let autoStep = 0
  const groundFor = (block) => {
    const pinned = resolveAmsterdamGround(block)
    if (pinned !== 'auto') return pinned
    return GROUND_ORDER[(blockStart + autoStep++) % GROUND_ORDER.length]
  }

  const actionButtons = actions.length > 0 && (
    <div className="ams-opener__actions">
      {actions.map((a, i) => (
        <button key={i} type="button" onClick={a.onClick} className={`ams-opener__btn${a.style === 'outline' ? ' ams-opener__btn--outline' : ''}`}>{a.label}</button>
      ))}
    </div>
  )

  return (
    <div className="ams-stage" data-mobile={mobile ? 'true' : 'false'} data-chrome={openerSurface} style={{ '--ams-ink': inks.ink, '--ams-on-ink': inks.onInk, '--ams-body-on-ink': inks.bodyOnInk || inks.onInk }}>
      <nav className="ams-rail" aria-label="Site navigation">
        <div className="ams-rail__top">
          <button className="ams-rail__btn" onClick={toggleMenu} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        {onPageClick
          ? <button className="ams-rail__logo" onClick={() => onPageClick(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{brand}</button>
          : <a className="ams-rail__logo" href={basePath || '/'}>{brand}</a>}
        <div className="ams-rail__foot">
          {footText && <span className="ams-rail__tagline">{footText}</span>}
        </div>
      </nav>

      <div
        className="ams-wall"
        ref={wallRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <section className="ams-menu" data-open={menuOpen ? 'true' : 'false'} data-surface="ink" aria-hidden={!menuOpen}>
          <div className="ams-menu__inner">
            <ul className="ams-menu__list">
              {tree.map(item => <li key={item.id}>{renderLink(item)}</li>)}
            </ul>
            {socialKeys.length > 0 && (
              <div className="ams-menu__socials">
                {socialKeys.map(k => {
                  const v = socials[k]
                  const href = v?.startsWith?.('http') ? v : `https://${k}.com/${String(v).replace(/^@/, '')}`
                  return <a key={k} className="ams-menu__social" href={href} target="_blank" rel="noopener noreferrer">{k}</a>
                })}
              </div>
            )}
          </div>
        </section>

        {heroOpener ? (
          <section className="ams-col ams-col--hero" data-surface="dark">
            <img className="ams-hero__img" src={getSizedUrl(coverUrl, 'display')} alt="" />
            <h1 className="ams-hero__title">{name}</h1>
            <div className="ams-hero__foot">
              {description && <p className="ams-hero__desc">{description}</p>}
              {actionButtons}
            </div>
          </section>
        ) : (
          <section className="ams-col ams-col--title" data-surface="ink">
            {name && <h1 className="ams-title__name">{name}</h1>}
            {description && <p className="ams-title__desc">{description}</p>}
            {actionButtons}
          </section>
        )}

        {blocks.map((block, index) => (
          <AmsterdamColumn
            key={`col-${index}`}
            block={block}
            blockIndex={index}
            ground={groundFor(block)}
            photoMeta={photoMeta}
            siteConfig={siteConfig}
            pages={pages}
            basePath={basePath}
            onImageClick={makeClickHandler ? makeClickHandler(index) : undefined}
            hoverProps={{
              ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
              ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
            }}
          />
        ))}
      </div>

      {!mobile && (
        <div className="ams-arrows">
          <button className="ams-arrows__btn" onClick={() => page('prev')} aria-label="Previous"><IconArrow dir="prev" /></button>
          <button className="ams-arrows__btn" onClick={() => page('next')} aria-label="Next"><IconArrow dir="next" /></button>
        </div>
      )}
    </div>
  )
}
