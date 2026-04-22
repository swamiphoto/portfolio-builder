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
  const { username } = params

  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }

  const [siteConfig, libraryConfig] = await Promise.all([
    readSiteConfig(lookup.userId),
    readLibraryConfig(lookup.userId).catch(() => ({ assets: {} })),
  ])

  if (!siteConfig) return { notFound: true }

  const assetsByUrl = {}
  for (const a of Object.values(libraryConfig?.assets || {})) {
    if (a?.publicUrl) assetsByUrl[a.publicUrl] = { assetId: a.assetId, caption: a.caption }
  }

  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(siteConfig)),
      assetsByUrl,
      username,
    },
  }
}

export default function PublicPortfolio({ siteConfig, assetsByUrl, username }) {
  const homePage = siteConfig.pages?.find((p) => p.id === 'home') || siteConfig.pages?.[0]
  const hasCoverPage = siteConfig.hasCoverPage !== false
  const coverConfig = siteConfig.cover || {}
  const initialPage = hasCoverPage && siteConfig.homePageId
    ? siteConfig.pages?.find(p => p.id === siteConfig.homePageId)
    : null
  const initialPageHref = initialPage ? `/sites/${username}/${initialPage.slug || initialPage.id}` : null

  const [unlocked, setUnlocked] = useState(!homePage?.password)
  if (!unlocked) {
    return <PasswordGate pageTitle={homePage?.title || 'Protected'} onUnlock={(v) => { if (v === homePage.password) { setUnlocked(true); return true } return false }} />
  }

  if (hasCoverPage) {
    return (
      <div className="min-h-screen bg-black font-sans relative">
        <PageCover
          cover={{
            imageUrl: coverConfig.imageUrl || '',
            height: coverConfig.height || 'full',
            variant: 'cover',
            buttonStyle: coverConfig.buttonStyle || 'solid',
          }}
          title={coverConfig.heading || siteConfig.siteName || ''}
          description={coverConfig.subheading || siteConfig.tagline || ''}
          primaryButton={initialPageHref ? { label: coverConfig.buttonText || 'View my portfolio', href: initialPageHref } : null}
          slideshowHref={null}
          clientFeaturesEnabled={false}
        />
      </div>
    )
  }

  const resolvedBlocks = (homePage?.blocks || []).map(block => resolveBlock(block, assetsByUrl))

  const navVariant = homePage?.cover?.imageUrl ? undefined : 'header-dropdown'
  const slideshowHref = homePage?.slideshow?.enabled ? `/sites/${username}/${homePage.slug || homePage.id}/slideshow` : null

  return (
    <div className="min-h-screen bg-white font-sans relative">
      <SiteNav siteConfig={siteConfig} username={username} variant={navVariant} />
      <main>
        <PageCover
          cover={homePage?.cover}
          title={homePage?.title}
          description={homePage?.description}
          slideshowHref={slideshowHref}
          clientFeaturesEnabled={!!homePage?.clientFeatures?.enabled}
          primaryButton={null}
        />
        {homePage ? (
          <Gallery
            name={homePage.title}
            description={homePage.description}
            blocks={resolvedBlocks}
            pages={siteConfig.pages}
            enableSlideshow={!!slideshowHref}
            onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            No content yet.
          </div>
        )}
      </main>
    </div>
  )
}
