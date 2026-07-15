// components/image-displays/page/SiteNav.js
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/router'
import { RxHamburgerMenu } from 'react-icons/rx'
import { TfiClose } from 'react-icons/tfi'
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'
import { useAdminViewport } from '../../../contexts/ViewportContext'

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Is this nav item the current page? Prefer an explicit id (preview mode where
// the route is /admin), else match the URL path (published site).
function navItemActive(item, { currentPageId, currentPath, basePath }) {
  if (item.type === 'link') return false
  if (currentPageId != null) return item.id === currentPageId
  return currentPath === `${basePath}/${item.slug || item.id}`
}

function navItemClass(dark, isActive) {
  return dark
    ? `font-serif text-base font-medium transition-colors ${isActive ? 'text-white underline' : 'text-white/70 hover:text-white'}`
    : `font-serif text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`
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

function NavList({ items, basePath, dark = false, currentPath = '', currentPageId, onPageClick, onClose }) {
  return (
    <ul className="flex gap-8">
      {items.map(item => (
        <li key={item.id}>
          <NavLink item={item} basePath={basePath} dark={dark}
            active={navItemActive(item, { currentPageId, currentPath, basePath })}
            onPageClick={onPageClick} onClose={onClose} />
        </li>
      ))}
    </ul>
  )
}

// Horizontal nav that collapses trailing items into a "More" dropdown when they
// would crowd the logo. Measures a hidden copy of the full list against the
// available width and shows as many as fit.
function OverflowNav({ items, basePath, dark = false, currentPath = '', currentPageId, onPageClick }) {
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
    const recompute = () => {
      const avail = wrap.clientWidth
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
    return () => ro.disconnect()
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
        {items.map(item => (
          <li key={item.id}><span className="font-serif text-base font-medium whitespace-nowrap">{item.title}</span></li>
        ))}
      </ul>

      <ul className="flex gap-8 items-center">
        {visible.map(item => (
          <li key={item.id} className="whitespace-nowrap">
            <NavLink item={item} basePath={basePath} dark={dark}
              active={navItemActive(item, { currentPageId, currentPath, basePath })}
              onPageClick={onPageClick} />
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
                  <div key={item.id} className={`px-5 py-1.5 font-serif text-base ${muted} ${navItemActive(item, { currentPageId, currentPath, basePath }) ? (dark ? '' : 'text-gray-900 underline') : ''}`}>
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

export default function SiteNav({ siteConfig, username, variant, onPageClick, basePath: basePathProp, currentPageId }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const adminViewport = useAdminViewport()
  const isMobile = adminViewport === 'mobile'
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.design?.theme)
  const basePath = basePathProp != null ? basePathProp : `/sites/${username}`
  const currentPath = router.asPath.split('?')[0]

  // Logo: show the uploaded image when logoType is 'image', otherwise the site name.
  const logoImage = siteConfig?.logoType === 'image' && siteConfig?.logo
  const brand = logoImage
    ? <img src={siteConfig.logo} alt={siteConfig.siteName || username || 'Logo'} style={{ maxHeight: 40, width: 'auto', display: 'block' }} />
    : (siteConfig.siteName || username)

  if (style === 'left-rail') {
    const socials = siteConfig.contact || {}
    const socialKeys = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website'].filter(k => socials[k])

    if (isMobile) {
      return (
        <>
          <header
            className="flex md:hidden items-center justify-between px-6 py-4 border-b border-black/10"
            style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
          >
            {onPageClick ? (
              <button onClick={() => onPageClick(null)} className="text-base font-semibold uppercase tracking-[0.16em] text-left">{brand}</button>
            ) : (
              <a href={basePath || '/'} className="text-base font-semibold uppercase tracking-[0.16em] text-left" style={{ textDecoration: 'none', color: 'inherit' }}>{brand}</a>
            )}
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2"><RxHamburgerMenu className="h-5 w-5" /></button>
          </header>
          {isMenuOpen && (
            <nav className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6" style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }} aria-label="Site navigation">
              <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="absolute top-5 right-5 p-2"><TfiClose className="h-5 w-5" /></button>
              {tree.map(item => {
                const isLink = item.type === 'link'
                const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
                const cls = 'text-lg uppercase tracking-[0.14em]'
                return onPageClick && !isLink ? (
                  <button key={item.id} onClick={() => { onPageClick(item.id); setIsMenuOpen(false) }} className={cls}>{item.title}</button>
                ) : (
                  <a key={item.id} href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>{item.title}</a>
                )
              })}
            </nav>
          )}
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
            <button onClick={() => onPageClick(null)} className="text-left text-lg font-semibold uppercase tracking-[0.18em] leading-tight">{brand}</button>
          ) : (
            <a href={basePath || '/'} className="text-lg font-semibold uppercase tracking-[0.18em] leading-tight" style={{ textDecoration: 'none', color: 'inherit' }}>{brand}</a>
          )}
          <ul className="flex flex-col gap-2">
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const isActive = navItemActive(item, { currentPageId, currentPath, basePath })
              const cls = `text-sm uppercase tracking-[0.12em] transition-colors ${isActive ? 'text-black underline' : 'text-black/50 hover:text-black'}`
              return (
                <li key={item.id}>
                  {onPageClick && !isLink
                    ? <button onClick={() => onPageClick(item.id)} className={cls}>{item.title}</button>
                    : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none' }}>{item.title}</a>}
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
      <header className="px-8 py-5 flex items-center justify-between">
        {onPageClick ? (
          <button className="font-serif2 text-2xl text-gray-900 tracking-wide text-left">{brand}</button>
        ) : (
          <a href={basePath || '/'} className="font-serif2 text-2xl text-gray-900 tracking-wide text-left">{brand}</a>
        )}

        {/* Desktop nav — hidden in mobile preview */}
        {!isMobile && (
          <OverflowNav items={tree} basePath={basePath} currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} />
        )}

        {/* Mobile hamburger button — shown in mobile preview */}
        {isMobile && (
          <button
            onClick={() => setIsMenuOpen(true)}
            className="rounded p-2 text-gray-600"
            aria-label="Open menu"
          >
            <RxHamburgerMenu className="h-5 w-5" />
          </button>
        )}

        {/* Mobile full-screen overlay */}
        {isMobile && isMenuOpen && (
          <nav className="fixed inset-0 bg-gray-100 z-30 flex flex-col items-center justify-center">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-5 right-5"
              aria-label="Close menu"
            >
              <TfiClose className="h-5 w-5" />
            </button>
            <ul className="flex flex-col items-center space-y-6">
              {tree.map(item => {
                const isLink = item.type === 'link'
                const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
                return (
                  <li key={item.id}>
                    {onPageClick && !isLink ? (
                      <button
                        onClick={() => { onPageClick(item.id); setIsMenuOpen(false) }}
                        className="font-serif text-xl font-medium text-gray-700"
                      >
                        {item.title}
                      </button>
                    ) : (
                      <a
                        href={href}
                        target={isLink ? '_blank' : undefined}
                        rel={isLink ? 'noopener noreferrer' : undefined}
                        onClick={() => setIsMenuOpen(false)}
                        className="font-serif text-xl font-medium text-gray-700"
                      >
                        {item.title}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </header>
    )
  }

  return (
    <nav className="absolute top-6 right-8 z-10">
      <NavList items={tree} basePath={basePath} dark currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} />
    </nav>
  )
}
