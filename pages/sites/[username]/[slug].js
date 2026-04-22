// pages/sites/[username]/[slug].js
import { useState } from 'react'
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveCaption } from '../../../common/captionResolver'
import Gallery from '../../../components/image-displays/gallery/Gallery'
import PageCover from '../../../components/image-displays/page/PageCover'
import SiteNav from '../../../components/image-displays/page/SiteNav'
import PasswordGate from '../../../components/image-displays/page/PasswordGate'

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    return { ...block, caption: resolveCaption(ref, assetsByUrl) }
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => ({ ...r, caption: resolveCaption(r, assetsByUrl) }))
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}

export async function getServerSideProps({ params }) {
  const { username, slug } = params
  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }
  const [siteConfig, libraryConfig] = await Promise.all([
    readSiteConfig(lookup.userId),
    readLibraryConfig(lookup.userId).catch(() => ({ assets: {} })),
  ])
  if (!siteConfig) return { notFound: true }
  const page = (siteConfig.pages || []).find(p => p.slug === slug || p.id === slug)
  if (!page) return { notFound: true }
  const assetsByUrl = {}
  for (const a of Object.values(libraryConfig?.assets || {})) {
    if (a?.publicUrl) assetsByUrl[a.publicUrl] = { assetId: a.assetId, caption: a.caption }
  }
  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(siteConfig)),
      page: JSON.parse(JSON.stringify(page)),
      assetsByUrl,
      username,
    },
  }
}

export default function PublicPage({ siteConfig, page, assetsByUrl, username }) {
  // Client-side gate only — not a security boundary. Real protection lives in clientFeatures.
  const [unlocked, setUnlocked] = useState(!page.password)
  if (!unlocked) {
    return <PasswordGate pageTitle={page.title} onUnlock={(v) => { if (v === page.password) { setUnlocked(true); return true } return false }} />
  }

  const resolvedBlocks = (page.blocks || []).map(b => resolveBlock(b, assetsByUrl))
  const navVariant = page?.cover?.imageUrl ? undefined : 'header-dropdown'
  const slideshowHref = page.slideshow?.enabled ? `/sites/${username}/${page.slug || page.id}/slideshow` : null
  // Sub-nav: if this page has a parent, show siblings. If it has children, show children.
  const allPages = siteConfig.pages || []
  const isChildPage = !!page.parentId
  const subNavPages = isChildPage
    ? allPages.filter(p => p.parentId === page.parentId && p.showInNav !== false)
    : allPages.filter(p => p.parentId === page.id && p.showInNav !== false)
  const activeSubNavId = isChildPage ? page.id : null
  return (
    <div className="min-h-screen bg-white font-sans relative">
      <SiteNav siteConfig={siteConfig} username={username} variant={navVariant} />
      <main>
        <PageCover
          cover={page.cover}
          title={page.title}
          description={page.description}
          slideshowHref={slideshowHref}
          clientFeaturesEnabled={page.clientFeatures?.enabled}
        />
        <Gallery
          name={page.title}
          description={page.description}
          blocks={resolvedBlocks}
          pages={siteConfig.pages}
          childPages={subNavPages}
          activeChildId={activeSubNavId}
          username={username}
          enableSlideshow={!!slideshowHref}
          onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
        />
      </main>
    </div>
  )
}
