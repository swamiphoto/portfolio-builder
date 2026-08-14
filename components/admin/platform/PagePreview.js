// The live preview shown on the right of the admin editor.
//
// This is rendered from a DEFERRED copy of siteConfig (see pages/admin/index.js)
// so that its heavy render (full site: nav, cover, all blocks, footer) runs at
// low priority and never blocks typing or clicking in the editor. Because it is
// memoized on `config`, urgent keystroke re-renders reuse the previous element
// and skip this subtree entirely; React re-renders it in the background once the
// deferred config catches up, so the preview always converges to the latest edit.
import { memo, useMemo } from 'react'
import PageCover from '../../image-displays/page/PageCover'
import SiteNav from '../../image-displays/page/SiteNav'
import SiteFooter from '../../image-displays/page/SiteFooter'
import ThemeProvider from '../../image-displays/ThemeProvider'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import { getTheme } from '../../../common/themes'
import { PreviewPackagesProvider } from '../../image-displays/engagement/ClientEngagementContext'
import { getPagePhotos } from '../../../common/assetRefs'
import { resolveHomePage } from '../../../common/homePage'
import { useIsMobile } from '../../../common/useIsMobile'

function PagePreview({
  config,
  pageId,
  username,
  assetsByUrl,
  onPageClick,
  onBlockHover,
  highlightedBlockIndex,
  onBlockClick,
}) {
  const isMobile = useIsMobile()
  const page = (pageId ? config?.pages?.find(p => p.id === pageId) : null) || resolveHomePage(config)
  if (!page) return null

  const theme = getTheme(config?.design?.theme)
  // Provence swaps the standard site nav for its own scroll-sticky header, which is
  // a live-site behavior (window scroll); the preview just shows cover + gallery.
  const isProvence = theme.id === 'provence'
  const isFlorence = theme.id === 'florence'
  const isAmsterdam = theme.id === 'amsterdam'
  const navVariant = theme.navStyle === 'left-rail'
    ? 'left-rail'
    : (page.cover?.imageUrl ? undefined : 'header-dropdown')

  const isChildPage = !!page.parentId
  const childPages = isChildPage
    ? (config?.pages || []).filter(p => p.parentId === page.parentId && p.showInNav !== false)
    : (config?.pages || []).filter(p => p.parentId === page.id && p.showInNav !== false)
  const activeChildId = isChildPage ? page.id : null

  const slideshowHref = (page.slideshow?.enabled && username)
    ? `/sites/${username}/${page.slug || page.id}/slideshow`
    : null

  // The covers self-gate the "View Packages" button on the engagement context,
  // which the preview otherwise never mounts. When packages are configured we wrap
  // the preview in a lightweight, checkout-less PreviewPackagesProvider so the
  // photographer sees the button (and can open the drawer) as they edit — no Stripe.
  const purchaseCfg = page.clientFeatures?.purchase
  const previewPackages = (page.clientFeatures?.enabled && purchaseCfg?.enabled ? (purchaseCfg?.packages || []) : [])
  const previewThumb = page.cover?.imageUrl || getPagePhotos(page)[0] || ''
  const previewCurrency = config?.printStore?.currency || 'USD'

  const hasCover = !!page.cover?.imageUrl
  const linkBase = username ? `/sites/${username}` : ''
  const coverNavLinks = hasCover
    ? childPages.map(p => ({ label: p.title, href: `${linkBase}/${p.slug || p.id}` }))
    : []

  // Stable identity: only changes when the actual content changes, so a hover
  // highlight (or any other re-render) doesn't reset the preview's debounce.
  const gallery = useMemo(() => ({
    name: page.title,
    description: page.description || '',
    blocks: page.blocks || [],
  }), [page.title, page.description, page.blocks])

  return (
    <ThemeProvider themeId={theme.id}>
      <PreviewPackagesProvider packages={previewPackages} currency={previewCurrency} thumb={previewThumb}>
      <div className="theme-shell" data-viewport={isMobile ? 'mobile' : 'desktop'}>
        {!isProvence && !isFlorence && !isAmsterdam && <SiteNav siteConfig={config} username={username} variant={navVariant} onPageClick={onPageClick} currentPageId={page.id} />}
        <div className="theme-content">
          <PageCover
            cover={page.cover}
            title={page.title}
            description={page.description}
            slideshowHref={slideshowHref}
            clientFeaturesEnabled={!!page.clientFeatures?.enabled}
            primaryButton={null}
            navLinks={coverNavLinks}
            themeId={theme.id}
            siteName={config?.siteName}
          />
          <GalleryPreview
            gallery={gallery}
            pages={config?.pages}
            childPages={childPages}
            activeChildId={activeChildId}
            username={username}
            assetsByUrl={assetsByUrl}
            printStore={config?.printStore}
            noWrap
            enableSlideshow={!!slideshowHref}
            onSlideshowClick={() => { if (slideshowHref) window.open(slideshowHref, '_blank', 'noopener,noreferrer') }}
            onChildPageClick={onPageClick}
            highlightedBlockIndex={highlightedBlockIndex}
            onBlockHover={onBlockHover}
            onBlockClick={onBlockClick}
            siteConfig={config}
            hasCover={hasCover}
            coverHeight={page.cover?.height || 'partial'}
            coverButtonStyle={page.cover?.buttonStyle || 'solid'}
            cover={page.cover}
            opener={page.id === resolveHomePage(config)?.id ? 'hero' : 'title'}
          />
          <SiteFooter siteConfig={config} />
        </div>
      </div>
      </PreviewPackagesProvider>
    </ThemeProvider>
  )
}

export default memo(PagePreview)
