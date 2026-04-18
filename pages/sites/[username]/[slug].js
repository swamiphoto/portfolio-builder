// pages/sites/[username]/[slug].js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveCaption } from '../../../common/captionResolver'
import Gallery from '../../../components/image-displays/gallery/Gallery'
import PageCover from '../../../components/image-displays/page/PageCover'
import SiteNav from '../../../components/image-displays/page/SiteNav'

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
  const resolvedBlocks = (page.blocks || []).map(b => resolveBlock(b, assetsByUrl))
  const navVariant = page?.cover?.imageUrl ? undefined : 'header-dropdown'
  return (
    <div className="min-h-screen bg-white font-sans">
      <SiteNav siteConfig={siteConfig} username={username} variant={navVariant} />
      <main>
        <PageCover cover={page.cover} title={page.title} />
        {page.slideshow?.enabled && (
          <div className="px-6 py-2">
            <a href={`/sites/${username}/${page.slug || page.id}/slideshow`} className="text-sm text-stone-500 hover:text-stone-900 underline">
              View slideshow ↗
            </a>
          </div>
        )}
        <Gallery blocks={resolvedBlocks} pages={siteConfig.pages} />
      </main>
    </div>
  )
}
