// pages/sites/[username]/[slug]/slideshow.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig } from '../../../../common/siteConfig'
import Slideshow from '../../../../components/image-displays/slideshow/Slideshow'
import PageMeta from '../../../../components/PageMeta'
import { pageDisplayThumbnail } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'
import { siteUrlFor } from '../../../../common/domainUtils'
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
  const siteName = siteConfig.siteName || username
  const siteUrl = siteUrlFor(siteConfig, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
  // Sharing a slideshow shows the page's own name / description / thumbnail.
  const meta = {
    title: page.title ? `${page.title} — ${siteName}` : siteName,
    ogTitle: page.title || siteName,
    description: page.description || siteConfig.tagline || '',
    image: getSizedUrl(pageDisplayThumbnail(page) || siteConfig.share?.largeImage || siteConfig.cover?.imageUrl || '', 'display'),
    url: `${siteUrl}/${page.slug || page.id}/slideshow`,
    siteName,
    favicon: siteConfig.favicon || null,
  }
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      siteName,
      musicCredit,
      meta,
    },
  }
}

export default function PageSlideshow({ page, siteName, musicCredit, meta }) {
  const slides = buildSlideSequence(page.blocks, page.slideshow?.excluded || [])
  if (slides.length === 0) {
    return <div className="flex items-center justify-center h-screen text-stone-400">No images on this page.</div>
  }
  return (
    <>
    {meta && <PageMeta {...meta} />}
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
    </>
  )
}
