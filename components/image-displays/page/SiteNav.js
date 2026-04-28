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

export default function SiteNav({ siteConfig, username, variant, onPageClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const adminViewport = useAdminViewport()
  const isMobile = adminViewport === 'mobile'
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.theme)
  const basePath = `/sites/${username}`
  const currentPath = router.asPath.split('?')[0]

  if (style === 'header-dropdown') {
    return (
      <header className="px-8 py-5 flex items-center justify-between">
        {onPageClick ? (
          <button className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</button>
        ) : (
          <a href={basePath} className="font-serif2 text-2xl text-gray-900 tracking-wide">{siteConfig.siteName || username}</a>
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
