// components/image-displays/page/SiteNav.js
import { useState } from 'react'
import { useRouter } from 'next/router'
import { RxHamburgerMenu } from 'react-icons/rx'
import { TfiClose } from 'react-icons/tfi'
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'
import { useAdminViewport } from '../../../contexts/ViewportContext'

function NavList({ items, basePath, depth = 0, dark = false, currentPath = '', onPageClick, onClose }) {
  return (
    <ul className={depth === 0 ? 'flex gap-8' : 'flex flex-col gap-1'}>
      {items.map(item => {
        const isLink = item.type === 'link'
        const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
        const target = isLink ? '_blank' : undefined
        const rel = isLink ? 'noopener noreferrer' : undefined
        const isActive = !isLink && currentPath === href

        const linkClass = dark
          ? `font-serif text-base font-medium transition-colors ${isActive ? 'text-white underline' : 'text-white/70 hover:text-white'}`
          : `font-serif text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`

        return (
          <li key={item.id}>
            {onPageClick && !isLink ? (
              <button onClick={() => { onPageClick(item.id); onClose?.() }} className={linkClass}>{item.title}</button>
            ) : (
              <a href={href} target={target} rel={rel} className={linkClass} onClick={onClose}>{item.title}</a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function SiteNav({ siteConfig, username, variant, onPageClick, basePath: basePathProp }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const adminViewport = useAdminViewport()
  const isMobile = adminViewport === 'mobile'
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.design?.theme)
  const basePath = basePathProp != null ? basePathProp : `/sites/${username}`
  const currentPath = router.asPath.split('?')[0]

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
              <button onClick={() => onPageClick(null)} className="text-base font-semibold uppercase tracking-[0.16em]">{siteConfig.siteName || username}</button>
            ) : (
              <a href={basePath || '/'} className="text-base font-semibold uppercase tracking-[0.16em]" style={{ textDecoration: 'none', color: 'inherit' }}>{siteConfig.siteName || username}</a>
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
            <button onClick={() => onPageClick(null)} className="text-left text-lg font-semibold uppercase tracking-[0.18em] leading-tight">{siteConfig.siteName || username}</button>
          ) : (
            <a href={basePath || '/'} className="text-lg font-semibold uppercase tracking-[0.18em] leading-tight" style={{ textDecoration: 'none', color: 'inherit' }}>{siteConfig.siteName || username}</a>
          )}
          <ul className="flex flex-col gap-2">
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const isActive = !isLink && currentPath === href
              const cls = `text-sm uppercase tracking-[0.12em] transition-colors ${isActive ? 'text-black' : 'text-black/50 hover:text-black'}`
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
          {siteConfig.footer?.customText && (
            <p className="text-[11px] leading-relaxed">{siteConfig.footer.customText}</p>
          )}
        </div>
      </nav>
    )
  }

  if (style === 'header-dropdown') {
    return (
      <header className="px-8 py-5 flex items-center justify-between">
        {onPageClick ? (
          <button className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</button>
        ) : (
          <a href={basePath || '/'} className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</a>
        )}

        {/* Desktop nav — hidden in mobile preview */}
        {!isMobile && (
          <NavList items={tree} basePath={basePath} currentPath={currentPath} onPageClick={onPageClick} />
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
      <NavList items={tree} basePath={basePath} dark currentPath={currentPath} onPageClick={onPageClick} />
    </nav>
  )
}
