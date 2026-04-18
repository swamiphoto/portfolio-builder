// pages/sites/[username]/[slug]/slideshow.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig } from '../../../../common/siteConfig'
import Slideshow from '../../../../components/image-displays/slideshow/Slideshow'

function collectImages(blocks) {
  const urls = []
  for (const b of blocks || []) {
    if (b.type === 'photo' && b.imageUrl) urls.push(b.imageUrl)
    if ((b.type === 'photos' || b.type === 'stacked' || b.type === 'masonry')) {
      for (const u of (b.imageUrls || [])) urls.push(u)
    }
  }
  return urls
}

export async function getServerSideProps({ params }) {
  const { username, slug } = params
  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }
  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return { notFound: true }
  const page = siteConfig.pages.find(p => p.slug === slug || p.id === slug)
  if (!page || !page.slideshow?.enabled) return { notFound: true }
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      siteName: siteConfig.siteName || username,
    },
  }
}

export default function PageSlideshow({ page, siteName }) {
  const slides = collectImages(page.blocks).map(url => ({ type: 'image', url }))
  if (slides.length === 0) {
    return <div className="flex items-center justify-center h-screen text-stone-400">No images on this page.</div>
  }
  return (
    <Slideshow
      slides={slides}
      layout={page.slideshow?.layout || 'kenburns'}
      title={page.title}
      subtitle={page.description || siteName}
      youtubeUrl={page.slideshow?.musicUrl || ''}
      thumbnailUrl={page.cover?.imageUrl || page.thumbnail?.imageUrl || ''}
      slug={page.slug || page.id}
    />
  )
}
