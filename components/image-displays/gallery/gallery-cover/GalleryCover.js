import React from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { useClientEngagement } from "../../engagement/ClientEngagementContext";
import { useIsMobile } from "../../../../common/useIsMobile";

const GalleryCover = ({ name, description, enableSlideshow = false, enableClientView = false, onBackClick, onSlideshowClick, onClientLoginClick, childPages, activeChildId, parentPage = null, username, basePath, onChildPageClick, showChildNav = true, suppressCover = false, coverHeight = 'partial', buttonStyle = 'solid' }) => {
  // "View Packages" is context-driven, same as PageCover: live gates on connected
  // payouts; the editor preview supplies a PreviewPackagesProvider so it shows there too.
  const ctx = useClientEngagement()
  const isMobile = useIsMobile()
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)
  // Buttons stack full-width, one per row, on mobile (and the admin Mobile preview,
  // which the JS flag respects — unlike CSS `sm:` breakpoints).
  const ctaWrap = isMobile
    ? 'flex flex-col items-stretch gap-3 mt-6 w-full'
    : 'flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full sm:w-auto'
  const ctaSize = isMobile
    ? 'w-full px-5 py-2.5 text-base'
    : 'w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg'

  // When the page has a cover image, PageCover renders the hero (title,
  // description, sub-nav links, and music-show/client buttons) over the image,
  // so this below-the-fold cover would duplicate all of it. Suppress it entirely.
  if (suppressCover) return null

  const hasChildNav = showChildNav && childPages?.length > 0
  const linkBase = basePath != null ? basePath : (username ? `/sites/${username}` : '')
  // Dropdown options: the section parent first (so you can jump back to it), then
  // its children. The current page is preselected via `activeChildId || parentPage.id`.
  const subNavOptions = parentPage ? [parentPage, ...(childPages || []).filter(c => c.id !== parentPage.id)] : (childPages || [])
  const hasActions = enableSlideshow || enableClientView || showPackages
  const hasContent = name || description || hasChildNav || hasActions

  if (!hasContent) return null

  // The image-less hero honors the same Full/Partial toggle as the image hero:
  // Full fills the viewport with the content vertically centered; Partial is the
  // compact band.
  const isFull = coverHeight === 'full'
  const containerCls = isFull
    ? 'relative flex flex-col items-center justify-center text-gray-900 px-4 md:px-20 min-h-screen'
    : 'relative flex flex-col items-center justify-center text-gray-900 px-4 pt-8 pb-6 md:px-20 md:pt-14 md:pb-8'
  const musicBtnCls = buttonStyle === 'outline'
    ? 'bg-transparent text-gray-900 border border-gray-900 hover:bg-gray-900/5'
    : 'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800'

  return (
    <div className={containerCls}>
      <div className={`text-center ${isMobile ? 'w-full px-4' : 'px-6'}`}>
        {name && <h1 className="text-4xl md:text-5xl font-serif2 mb-4">{name}</h1>}
        {description && <p className="font-serif text-[20px] md:text-[22px] font-normal leading-8 max-w-3xl mx-auto mb-6 text-gray-900" style={{ letterSpacing: '-0.6px' }}>{description}</p>}

        {hasChildNav && (
          isMobile ? (
            // A row of links overflows a phone, so the inline sub-nav becomes a
            // dropdown that jumps to the chosen page.
            <div className="mb-6 flex justify-center">
              <select
                aria-label="Choose a page"
                value={activeChildId || parentPage?.id || ''}
                onChange={(e) => {
                  const id = e.target.value
                  if (!id) return
                  if (onChildPageClick) { onChildPageClick(id); return }
                  const p = subNavOptions.find(o => o.id === id)
                  if (p) window.location.href = `${linkBase}/${p.slug || p.id}`
                }}
                className="w-full max-w-xs font-serif text-base text-gray-900 bg-white/80 border border-gray-400 rounded-md py-2.5 pl-4 pr-10 cursor-pointer focus:outline-none focus:border-gray-600"
                style={{
                  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  backgroundSize: '12px',
                }}
              >
                {subNavOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          ) : (
            <ul className="flex items-center justify-center gap-8 mb-6">
              {childPages.map(p => {
                const isActive = p.id === activeChildId
                const cls = `font-serif text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`
                return (
                  <li key={p.id}>
                    {onChildPageClick ? (
                      <button onClick={() => onChildPageClick(p.id)} className={cls}>{p.title}</button>
                    ) : (
                      <a href={`${linkBase}/${p.slug || p.id}`} className={cls}>{p.title}</a>
                    )}
                  </li>
                )
              })}
            </ul>
          )
        )}

        {hasActions && (
          <div className={ctaWrap}>
            {enableSlideshow && (
              <button onClick={onSlideshowClick} className={`${ctaSize} font-serif font-light transition tracking-wide ${musicBtnCls}`}>
                View Music Show
              </button>
            )}
            {showPackages && (
              <button onClick={() => ctx?.openPurchase?.()} className={`${ctaSize} font-serif font-light transition tracking-wide bg-transparent text-gray-900 border border-gray-900 hover:bg-gray-900/5`}>
                View Packages
              </button>
            )}
            {enableClientView && (
              <button onClick={onClientLoginClick} className={`${ctaSize} border border-gray-500 text-gray-700 font-serif font-light hover:text-black hover:border-gray-700 transition tracking-wide`}>
                Client Login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryCover;
