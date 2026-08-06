// components/image-displays/page/ProvenceHeader.js
// Provence's client-gallery header. It sits out of the way over the split cover
// and materializes (fixed, cream, hairline-ruled) once you scroll into the gallery:
//   left  — the gallery name (doubles as the wordmark / home link)
//   right — View Music Show + View Packages (outline) + a "More" menu holding the
//           rest of the site's pages.
// Must render inside ClientEngagementProvider so it can read the packages state.
import { useEffect, useState } from 'react'
import { useClientEngagement } from '../engagement/ClientEngagementContext'

export default function ProvenceHeader({ title, basePath, pages = [], currentPageId, slideshowHref, startVisible = false }) {
  const ctx = useClientEngagement()
  const [visible, setVisible] = useState(startVisible)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Without a cover there's no hero for the header to hide behind, so it stays
    // pinned from the top; with a cover it reveals once you scroll into the gallery.
    const onScroll = () => {
      const threshold = (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.6
      setVisible(startVisible || window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [startVisible])

  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)
  const navPages = (pages || []).filter((p) => !p.parentId && p.showInNav !== false)

  return (
    <header className={`provence-header ${visible ? 'is-visible' : ''}`} data-testid="provence-header">
      <a className="provence-header__brand" href={basePath || '/'}>{title}</a>
      <div className="provence-header__actions">
        {slideshowHref && (
          <a className="provence-header__btn" href={slideshowHref}>View Music Show</a>
        )}
        {showPackages && (
          <button type="button" className="provence-header__btn provence-header__btn--outline" onClick={() => ctx?.openPurchase?.()}>
            View Packages
          </button>
        )}
        {navPages.length > 0 && (
          <div className="provence-header__more">
            <button type="button" className="provence-header__btn provence-header__btn--ghost" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              More ▾
            </button>
            {menuOpen && (
              <>
                <div className="provence-header__scrim" onClick={() => setMenuOpen(false)} />
                <nav className="provence-header__menu" aria-label="Site pages">
                  {navPages.map((p) => (
                    <a
                      key={p.id}
                      href={`${basePath}/${p.slug || p.id}`}
                      className={`provence-header__menu-item ${p.id === currentPageId ? 'is-active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {p.title}
                    </a>
                  ))}
                </nav>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
