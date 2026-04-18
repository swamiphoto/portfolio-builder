import { lookupUserByUsername } from '../../common/userProfile'
import { readSiteConfig } from '../../common/siteConfig'
import { readLibraryConfig } from '../../common/adminConfig'
import { resolveCaption } from '../../common/captionResolver'
import Gallery from '../../components/image-displays/gallery/Gallery'
import PageCover from '../../components/image-displays/page/PageCover'

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

  const resolvedBlocks = (homePage?.blocks || []).map(block => resolveBlock(block, assetsByUrl))

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="px-6 py-4 border-b border-gray-100">
        <h1 className="text-sm font-semibold text-gray-900">{siteConfig.siteName || username}</h1>
      </header>
      <main>
        <PageCover cover={homePage?.cover} title={homePage?.title} />
        {homePage ? (
          <Gallery
            blocks={resolvedBlocks}
            pages={siteConfig.pages}
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
