// pages/sites/[username]/[slug]/slideshow.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig } from '../../../../common/siteConfig'
import Slideshow from '../../../../components/image-displays/slideshow/Slideshow'
import { pageDisplayThumbnail } from '../../../../common/assetRefs'
import { buildSlideSequence, musicLabelForUrl } from '../../../../common/slideshowSync'

// The music credit shown in the player: prefer the curated pool label, otherwise
// fetch the real video title from YouTube's oEmbed endpoint (server-side, so no CORS).
async function resolveMusicCredit(musicUrl) {
  if (!musicUrl) return ''
  const poolLabel = musicLabelForUrl(musicUrl)
  if (poolLabel) return poolLabel
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(musicUrl)}&format=json`, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return ''
    const data = await res.json()
    return data?.title || ''
  } catch {
    return ''
  }
}

export async function getServerSideProps({ params }) {
  const { username, slug } = params
  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }
  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return { notFound: true }
  const page = (siteConfig.pages || []).find(p => p.slug === slug || p.id === slug)
  if (!page || !page.slideshow?.enabled) return { notFound: true }
  const musicCredit = await resolveMusicCredit(page.slideshow?.musicUrl || '')
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      siteName: siteConfig.siteName || username,
      musicCredit,
    },
  }
}

export default function PageSlideshow({ page, siteName, musicCredit }) {
  const slides = buildSlideSequence(page.blocks, page.slideshow?.excluded || [])
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
      thumbnailUrl={pageDisplayThumbnail(page)}
      slug={page.slug || page.id}
      musicCredits={musicCredit ? [musicCredit] : []}
      initialModalOpen={false}
    />
  )
}
