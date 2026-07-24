// components/image-displays/page/SiteNav.js
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/router'
import { RxHamburgerMenu } from 'react-icons/rx'
import { TfiClose } from 'react-icons/tfi'
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'
import { useIsMobile } from '../../../common/useIsMobile'
import { logoFontStyle, resolveSubNavStyle, resolveNavMode } from '../../../common/siteDesign'

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Is this nav item the current page? Prefer an explicit id (preview mode where
// the route is /admin), else match the URL path (published site). A parent is
// also "active" when one of its subpages is the current page, so the top-level
// item stays highlighted while you're inside its section.
function navItemActive(item, ctx) {
  if (item.type === 'link') return false
  const { currentPageId, currentPath, basePath } = ctx
  const selfActive = currentPageId != null
    ? item.id === currentPageId
    : currentPath === `${basePath}/${item.slug || item.id}`
  if (selfActive) return true
  return (item.children || []).some(child => navItemActive(child, ctx))
}

// A small chevron caret for parent nav items and the menu trigger. Rotates when
// its menu is open. Sized to read clearly as a triangle, not a dot.
function Caret({ open = false, size = 11 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 12 12" aria-hidden
      style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function navItemClass(dark, isActive) {
  return dark
    ? `font-serif text-sm md:text-base font-medium transition-colors ${isActive ? 'text-white underline' : 'text-white/70 hover:text-white'}`
    : `font-serif text-sm md:text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`
}

function NavLink({ item, basePath, dark, active, onPageClick, onClose }) {
  const isLink = item.type === 'link'
  const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
  const cls = navItemClass(dark, active)
  if (onPageClick && !isLink) {
    return <button onClick={() => { onPageClick(item.id); onClose?.() }} className={cls}>{item.title}</button>
  }
  return (
    <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} onClick={onClose}>{item.title}</a>
  )
}

// A single top-level nav item. When it has children and the site uses the
// "dropdown" sub-nav style, it shows a caret and reveals a themed menu of its
// subpages; the parent label still navigates to the parent page.
function NavItem({ item, basePath, dark, currentPath, currentPageId, onPageClick, onClose, subNavMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const children = item.children || []
  const hasDropdown = subNavMode === 'dropdown' && children.length > 0
  const active = navItemActive(item, { currentPageId, currentPath, basePath })

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!hasDropdown) {
    return <NavLink item={item} basePath={basePath} dark={dark} active={active} onPageClick={onPageClick} onClose={onClose} />
  }

  const menuBg = dark ? '#1a120a' : '#fffdf9'
  const menuBorder = dark ? 'rgba(255,255,255,0.14)' : 'rgba(26,18,10,0.12)'
  const muted = dark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      <NavLink item={item} basePath={basePath} dark={dark} active={active} onPageClick={onPageClick} onClose={onClose} />
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center transition-colors ${dark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${item.title} submenu`}
        style={{ lineHeight: 1, padding: '0 2px' }}
      >
        <Caret open={open} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-3 py-2 min-w-[168px] z-40 rounded-sm"
          style={{ background: menuBg, border: `1px solid ${menuBorder}`, boxShadow: '0 8px 28px rgba(26,18,10,0.14)' }}
        >
          {children.map(child => {
            const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
            return (
              <div key={child.id} className={`px-5 py-1.5 font-serif text-sm md:text-base ${muted} ${cActive ? (dark ? 'text-white underline' : 'text-gray-900 underline') : ''}`}>
                <NavLink item={child} basePath={basePath} dark={dark} active={cActive} onPageClick={onPageClick} onClose={() => setOpen(false)} />
              </div>
            )
          })}
        </div>
      )}
    </span>
  )
}

function NavList({ items, basePath, dark = false, currentPath = '', currentPageId, onPageClick, onClose, subNavMode = 'dropdown' }) {
  return (
    <ul className="flex gap-8">
      {items.map(item => (
        <li key={item.id}>
          <NavItem item={item} basePath={basePath} dark={dark}
            currentPath={currentPath} currentPageId={currentPageId}
            onPageClick={onPageClick} onClose={onClose} subNavMode={subNavMode} />
        </li>
      ))}
    </ul>
  )
}

// Horizontal nav that collapses trailing items into a "More" dropdown when they
// would crowd the logo. Measures a hidden copy of the full list against the
// available width and shows as many as fit.
function OverflowNav({ items, basePath, dark = false, currentPath = '', currentPageId, onPageClick, subNavMode = 'dropdown' }) {
  const wrapRef = useRef(null)
  const measureRef = useRef(null)
  const [visibleCount, setVisibleCount] = useState(items.length)
  const [open, setOpen] = useState(false)

  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current
    const measure = measureRef.current
    if (!wrap || !measure) return
    const GAP = 32 // matches gap-8
    const MORE = 60 + GAP // reserve room for the "More" trigger
    const PAD = 12 // safety gap so links never butt right up against the logo
    const recompute = () => {
      const avail = wrap.clientWidth - PAD
      const kids = Array.from(measure.children)
      const total = kids.reduce((a, el, i) => a + el.offsetWidth + (i > 0 ? GAP : 0), 0)
      if (total <= avail) { setVisibleCount(items.length); return }
      let used = 0, count = 0
      for (let i = 0; i < kids.length; i++) {
        const w = kids[i].offsetWidth + (i > 0 ? GAP : 0)
        if (used + w + MORE <= avail) { used += w; count++ } else break
      }
      setVisibleCount(Math.max(1, count))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(wrap)
    // Link + wordmark widths change once the serif fonts load, which can change
    // how many links fit without resizing `wrap` — so the ResizeObserver alone
    // misses it. Re-measure when fonts settle.
    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { if (!cancelled) recompute() })
    }
    return () => { cancelled = true; ro.disconnect() }
  }, [items])

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const visible = items.slice(0, visibleCount)
  const overflow = items.slice(visibleCount)
  const overflowActive = overflow.some(item => navItemActive(item, { currentPageId, currentPath, basePath }))
  const muted = dark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'

  return (
    <nav ref={wrapRef} className="flex-1 min-w-0 flex justify-end items-center relative">
      {/* Hidden measurer: the full list at natural size. */}
      <ul ref={measureRef} aria-hidden className="flex gap-8 absolute invisible pointer-events-none" style={{ left: -99999, top: 0 }}>
        {items.map(item => {
          // Parents in dropdown mode render an extra caret button — include its
          // width here so the fit measurement matches the real row.
          const hasCaret = subNavMode === 'dropdown' && (item.children || []).length > 0
          return <li key={item.id}><span className="font-serif text-base font-medium whitespace-nowrap">{item.title}{hasCaret ? '  ▾' : ''}</span></li>
        })}
      </ul>

      <ul className="flex gap-8 items-center">
        {visible.map(item => (
          <li key={item.id} className="whitespace-nowrap">
            <NavItem item={item} basePath={basePath} dark={dark} currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} subNavMode={subNavMode} />
          </li>
        ))}
        {overflow.length > 0 && (
          <li className="relative whitespace-nowrap">
            <button
              onClick={() => setOpen(o => !o)}
              className={navItemClass(dark, overflowActive)}
              aria-haspopup="true" aria-expanded={open}
            >
              More <span aria-hidden style={{ fontSize: '0.7em' }}>▾</span>
            </button>
            {open && (
              <div
                className="absolute right-0 top-full mt-3 py-2 min-w-[168px] z-40 rounded-sm"
                style={{ background: '#fffdf9', border: '1px solid rgba(26,18,10,0.12)', boxShadow: '0 8px 28px rgba(26,18,10,0.14)' }}
              >
                {overflow.map(item => (
                  <div key={item.id} className={`px-5 py-1.5 font-serif text-sm md:text-base ${muted} ${navItemActive(item, { currentPageId, currentPath, basePath }) ? (dark ? '' : 'text-gray-900 underline') : ''}`}>
                    <NavLink item={item} basePath={basePath} dark={dark}
                      active={navItemActive(item, { currentPageId, currentPath, basePath })}
                      onPageClick={onPageClick} onClose={() => setOpen(false)} />
                  </div>
                ))}
              </div>
            )}
          </li>
        )}
      </ul>
    </nav>
  )
}

// Hamburger menu used by "Menu" navigation mode. On desktop it opens a compact
// dropdown panel anchored under the trigger (a normal menu, not a takeover); in
// the admin mobile preview it opens the full-screen overlay.
function NavMenu({ tree, basePath, currentPath, currentPageId, onPageClick, isMobile, triggerClass, overlayStyle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const renderLink = (item, cls) => {
    const isLink = item.type === 'link'
    const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
    return (onPageClick && !isLink)
      ? <button onClick={() => { onPageClick(item.id); setOpen(false) }} className={cls}>{item.title}</button>
      : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} onClick={() => setOpen(false)} className={cls} style={{ textDecoration: 'none', color: 'inherit' }}>{item.title}</a>
  }

  // Phone → full-screen scrollable overlay (shared design).
  if (isMobile) {
    return (
      <>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className={triggerClass}>
          <RxHamburgerMenu className="h-6 w-6" />
        </button>
        <MobileNavOverlay
          open={open} onClose={() => setOpen(false)} tree={tree} basePath={basePath}
          currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} overlayStyle={overlayStyle}
        />
      </>
    )
  }

  // Desktop → compact dropdown panel anchored under the trigger.
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-label="Open menu" aria-haspopup="menu" aria-expanded={open} className={triggerClass}>
        <RxHamburgerMenu className="h-6 w-6" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-3 py-2 min-w-[190px] z-40 rounded-sm"
          style={{ background: '#fffdf9', border: '1px solid rgba(26,18,10,0.12)', boxShadow: '0 8px 28px rgba(26,18,10,0.14)' }}
        >
          {tree.map(item => {
            const kids = item.children || []
            const active = navItemActive(item, { currentPageId, currentPath, basePath })
            return (
              <div key={item.id}>
                <div className={`px-5 py-1.5 font-serif text-base ${active ? 'text-gray-900 underline' : 'text-gray-600 hover:text-gray-900'}`}>
                  {renderLink(item, 'block w-full text-left')}
                </div>
                {kids.map(child => {
                  const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
                  return (
                    <div key={child.id} className={`pl-9 pr-5 py-1 font-serif text-sm ${cActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`}>
                      {renderLink(child, 'block w-full text-left')}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// One shared mobile menu for every nav variant. Parent links are large; children
// sit indented under their parent on a hairline rail, generously spaced. The list
// scrolls when tall, with the close button pinned above it. `overlayStyle` themes
// the background/text per variant.
function MobileNavOverlay({ open, onClose, tree, basePath, currentPath, currentPageId, onPageClick, overlayStyle }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null

  const renderItem = (item, cls) => {
    const isLink = item.type === 'link'
    const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
    if (onPageClick && !isLink) {
      return <button onClick={() => { onPageClick(item.id); onClose() }} className={cls}>{item.title}</button>
    }
    return <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} onClick={onClose} className={cls} style={{ textDecoration: 'none', color: 'inherit' }}>{item.title}</a>
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={overlayStyle} aria-label="Site navigation" role="dialog" aria-modal="true">
      <div className="flex items-center justify-end h-16 px-5 shrink-0">
        <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2 opacity-70 hover:opacity-100 transition-opacity"><TfiClose className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-7 pb-16">
        <ul className="flex flex-col">
          {tree.map(item => {
            const kids = item.children || []
            const active = navItemActive(item, { currentPageId, currentPath, basePath })
            const parentCls = `block py-2.5 font-serif text-[26px] leading-tight transition-opacity ${active ? 'opacity-100 font-medium' : 'opacity-80 hover:opacity-100'}`
            return (
              <li key={item.id} className="border-b border-current/10 last:border-b-0 py-1">
                {renderItem(item, parentCls)}
                {kids.length > 0 && (
                  <ul className="mt-1 mb-3 ml-1 pl-4 border-l border-current/20 flex flex-col gap-0.5">
                    {kids.map(child => {
                      const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
                      const childCls = `block py-1.5 font-serif text-lg transition-opacity ${cActive ? 'opacity-100 underline' : 'opacity-60 hover:opacity-90'}`
                      return <li key={child.id}>{renderItem(child, childCls)}</li>
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export default function SiteNav({ siteConfig, username, variant, onPageClick, basePath: basePathProp, currentPageId }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const isPhone = useIsMobile()
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.design?.theme)
  const subNavMode = resolveSubNavStyle(siteConfig?.design)
  const navMode = resolveNavMode(siteConfig?.design)
  const basePath = basePathProp != null ? basePathProp : `/sites/${username}`
  const currentPath = router.asPath.split('?')[0]

  // Logo: show the uploaded image when logoType is 'image', otherwise the site name.
  const logoImage = siteConfig?.logoType === 'image' && siteConfig?.logo
  const brand = logoImage
    ? <img src={siteConfig.logo} alt={siteConfig.siteName || username || 'Logo'} className="px-1" style={{ maxHeight: isPhone ? 30 : 40, width: 'auto', display: 'block' }} />
    : (siteConfig.siteName || username)

  // Wordmark font only applies to the site-name logo, never an uploaded image.
  const logoStyle = logoImage ? null : logoFontStyle(siteConfig?.logoFont)

  if (style === 'left-rail') {
    const socials = siteConfig.contact || {}
    const socialKeys = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website'].filter(k => socials[k])

    if (isPhone) {
      return (
        <>
          <header
            className="flex items-center justify-between px-6 py-4 border-b border-black/10"
            style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
          >
            {onPageClick ? (
              <button onClick={() => onPageClick(null)} className="min-w-0 truncate text-base font-semibold uppercase tracking-[0.12em] sm:tracking-[0.16em] text-left" style={logoStyle || undefined}>{brand}</button>
            ) : (
              <a href={basePath || '/'} className="min-w-0 truncate text-base font-semibold uppercase tracking-[0.12em] sm:tracking-[0.16em] text-left" style={{ textDecoration: 'none', color: 'inherit', ...(logoStyle || {}) }}>{brand}</a>
            )}
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="shrink-0 p-2"><RxHamburgerMenu className="h-5 w-5" /></button>
          </header>
          <MobileNavOverlay
            open={isMenuOpen} onClose={() => setIsMenuOpen(false)} tree={tree} basePath={basePath}
            currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick}
            overlayStyle={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
          />
        </>
      )
    }

    return (
      <nav
        data-testid="left-rail"
        aria-label="Site navigation"
        className="left-rail hidden md:flex flex-col justify-between sticky top-0 self-start h-screen w-[260px] shrink-0 px-8 py-10 border-r border-black/10"
        style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
      >
        <div className="flex flex-col gap-10">
          {onPageClick ? (
            <button onClick={() => onPageClick(null)} className="text-left text-lg font-semibold uppercase tracking-[0.18em] leading-tight" style={logoStyle || undefined}>{brand}</button>
          ) : (
            <a href={basePath || '/'} className="text-lg font-semibold uppercase tracking-[0.18em] leading-tight" style={{ textDecoration: 'none', color: 'inherit', ...(logoStyle || {}) }}>{brand}</a>
          )}
          <ul className="flex flex-col gap-2">
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const isActive = navItemActive(item, { currentPageId, currentPath, basePath })
              const cls = `text-sm uppercase tracking-[0.12em] transition-colors ${isActive ? 'text-black underline' : 'text-black/50 hover:text-black'}`
              const kids = item.children || []
              return (
                <li key={item.id}>
                  {onPageClick && !isLink
                    ? <button onClick={() => onPageClick(item.id)} className={cls}>{item.title}</button>
                    : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none' }}>{item.title}</a>}
                  {kids.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mt-1.5 ml-3">
                      {kids.map(child => {
                        const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
                        const cCls = `text-xs uppercase tracking-[0.10em] transition-colors ${cActive ? 'text-black underline' : 'text-black/40 hover:text-black'}`
                        const cHref = `${basePath}/${child.slug || child.id}`
                        return (
                          <li key={child.id}>
                            {onPageClick
                              ? <button onClick={() => onPageClick(child.id)} className={cCls}>{child.title}</button>
                              : <a href={cHref} className={cCls} style={{ textDecoration: 'none' }}>{child.title}</a>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-4 text-black/40">
          {socialKeys.length > 0 && (
            <div className="flex gap-3 text-xs uppercase tracking-[0.12em]">
              {socialKeys.map(k => <span key={k} aria-hidden="true">{k[0].toUpperCase()}</span>)}
            </div>
          )}
        </div>
      </nav>
    )
  }

  if (style === 'header-dropdown') {
    return (
      <header className="px-5 md:px-8 py-5 flex items-center justify-between gap-4 md:gap-8">
        {onPageClick ? (
          <button className={`font-serif2 ${isPhone ? 'text-xl' : 'text-2xl'} text-gray-900 tracking-wide text-left min-w-0 truncate ${isPhone ? '' : 'shrink-0 whitespace-nowrap'}`} style={logoStyle || undefined}>{brand}</button>
        ) : (
          <a href={basePath || '/'} className={`font-serif2 ${isPhone ? 'text-xl' : 'text-2xl'} text-gray-900 tracking-wide text-left min-w-0 truncate ${isPhone ? '' : 'shrink-0 whitespace-nowrap'}`} style={logoStyle || undefined}>{brand}</a>
        )}

        {/* Desktop nav — hidden on phones (which use the hamburger) or when Menu mode is on */}
        {navMode === 'menu' ? (
          <NavMenu
            tree={tree} basePath={basePath} currentPath={currentPath} currentPageId={currentPageId}
            onPageClick={onPageClick} isMobile={isPhone}
            triggerClass="rounded p-2 text-gray-600"
            overlayStyle={{ background: '#f3f4f6', color: '#374151' }}
          />
        ) : (
          <>
            {/* Desktop links */}
            {!isPhone && (
              <OverflowNav items={tree} basePath={basePath} currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} subNavMode={subNavMode} />
            )}

            {/* Phone: hamburger + shared overlay (even when the desktop mode is Links) */}
            {isPhone && (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="rounded p-2 text-gray-600"
                aria-label="Open menu"
              >
                <RxHamburgerMenu className="h-5 w-5" />
              </button>
            )}
            <MobileNavOverlay
              open={isPhone && isMenuOpen} onClose={() => setIsMenuOpen(false)} tree={tree} basePath={basePath}
              currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick}
              overlayStyle={{ background: '#f3f4f6', color: '#374151' }}
            />
          </>
        )}
      </header>
    )
  }

  if (navMode === 'menu') {
    return (
      <nav className="absolute top-6 right-8 z-20" aria-label="Site navigation">
        <NavMenu
          tree={tree} basePath={basePath} currentPath={currentPath} currentPageId={currentPageId}
          onPageClick={onPageClick} isMobile={isPhone}
          triggerClass="p-2 text-white"
          overlayStyle={{ background: 'var(--theme-bg, #1a120a)', color: 'var(--theme-text, #f5efe6)' }}
        />
      </nav>
    )
  }

  // Links mode: horizontal links on desktop, hamburger + shared overlay on phones.
  return (
    <nav className="absolute top-6 right-8 z-10">
      {isPhone ? (
        <>
          <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2 text-white"><RxHamburgerMenu className="h-6 w-6" /></button>
          <MobileNavOverlay
            open={isMenuOpen} onClose={() => setIsMenuOpen(false)} tree={tree} basePath={basePath}
            currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick}
            overlayStyle={{ background: 'var(--theme-bg, #1a120a)', color: 'var(--theme-text, #f5efe6)' }}
          />
        </>
      ) : (
        <NavList items={tree} basePath={basePath} dark currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} subNavMode={subNavMode} />
      )}
    </nav>
  )
}
