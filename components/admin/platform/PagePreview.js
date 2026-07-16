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

function resolveHomePage(config) {
  const pages = config?.pages || []
  if (!pages.length) return null
  return pages.find(p => p.id === config.homePageId)
    || pages.find(p => p.id === 'home')
    || pages.find(p => p.showInNav && p.type !== 'link')
    || pages.find(p => p.type !== 'link')
    || pages[0]
    || null
}

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
  const page = (pageId ? config?.pages?.find(p => p.id === pageId) : null) || resolveHomePage(config)
  if (!page) return null

  const theme = getTheme(config?.design?.theme)
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
      <div className="theme-shell">
        <SiteNav siteConfig={config} username={username} variant={navVariant} onPageClick={onPageClick} currentPageId={page.id} />
        <div className="theme-content">
          <PageCover
            cover={page.cover}
            title={page.title}
            description={page.description}
            slideshowHref={slideshowHref}
            clientFeaturesEnabled={!!page.clientFeatures?.enabled}
            primaryButton={null}
            navLinks={coverNavLinks}
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
          />
          <SiteFooter siteConfig={config} />
        </div>
      </div>
    </ThemeProvider>
  )
}

export default memo(PagePreview)
