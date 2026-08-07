import { useState } from 'react'
import Head from 'next/head'
import { lookupUserByUsername } from '../../../common/userProfile'
import { resolveHomePage } from '../../../common/homePage'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveCaption } from '../../../common/captionResolver'
import { siteUrlFor, basePathFor } from '../../../common/domainUtils'
import { publicSiteConfig, publicPrintForAsset, publicPrintStore } from '../../../common/print/publicPrint'
import Gallery from '../../../components/image-displays/gallery/Gallery'
import PageCover from '../../../components/image-displays/page/PageCover'
import SiteNav from '../../../components/image-displays/page/SiteNav'
import ProvenceHeader from '../../../components/image-displays/page/ProvenceHeader'
import SiteFooter from '../../../components/image-displays/page/SiteFooter'
import PasswordGate from '../../../components/image-displays/page/PasswordGate'
import ThemeProvider from '../../../components/image-displays/ThemeProvider'
import SiteAnalytics from '../../../components/image-displays/SiteAnalytics'
import { getTheme } from '../../../common/themes'
import { ClientEngagementProvider } from '../../../components/image-displays/engagement/ClientEngagementContext'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    const entry = assetsByUrl[block.imageUrl]
    const resolved = { ...block, caption: resolveCaption(ref, assetsByUrl) }
    if (entry?.print) resolved.print = entry.print
    return resolved
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => {
      const entry = assetsByUrl[r.url]
      const out = { ...r, caption: resolveCaption(r, assetsByUrl) }
      if (entry?.print) out.print = entry.print
      return out
    })
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}

export async function getServerSideProps({ params, req }) {
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
    if (!a?.publicUrl) continue
    const entry = { assetId: a.assetId, caption: a.caption }
    const print = publicPrintForAsset(a)
    if (print) entry.print = print
    assetsByUrl[a.publicUrl] = entry
  }
  const printStore = publicPrintStore(siteConfig)

  const basePath = basePathFor(req.headers.host, process.env.NEXT_PUBLIC_ROOT_DOMAIN, username)

  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(publicSiteConfig(siteConfig))),
      assetsByUrl,
      printStore,
      username,
      basePath,
    },
  }
}

export default function PublicPortfolio({ siteConfig, assetsByUrl, printStore, username, basePath }) {
  const ogImage = siteConfig.share?.largeImage || siteConfig.cover?.imageUrl || ''
  const ogTitle = siteConfig.siteName || 'Portfolio'
  const ogDescription = siteConfig.tagline || ''
  const siteUrl = siteUrlFor(siteConfig, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)

  const homePage = resolveHomePage(siteConfig)
  const hasCoverPage = siteConfig.hasCoverPage !== false
  const coverConfig = siteConfig.cover || {}
  const initialPageHref = homePage ? `${basePath}/${homePage.slug || homePage.id}` : null
  const [comingSoon, setComingSoon] = useState(false)

  const [unlocked, setUnlocked] = useState(!homePage?.password)
  if (!unlocked) {
    return <PasswordGate pageTitle={homePage?.title || 'Protected'} message={homePage?.passwordGateMessage} onUnlock={(v) => { if (v === homePage.password) { setUnlocked(true); return true } return false }} />
  }

  if (hasCoverPage) {
    return (
      <div className="min-h-screen bg-[#33261a] font-sans relative">
        <Head>
          <title>{ogTitle}</title>
          <meta name="description" content={ogDescription} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={siteUrl} />
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          {ogImage && <meta property="og:image" content={ogImage} />}
          <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
          <meta name="twitter:title" content={ogTitle} />
          <meta name="twitter:description" content={ogDescription} />
          {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Head>
        <SiteAnalytics analytics={siteConfig.analytics} />
        <PageCover
          cover={{
            imageUrl: coverConfig.imageUrl || '',
            height: coverConfig.height || 'full',
            variant: 'cover',
            buttonStyle: coverConfig.buttonStyle || 'solid',
          }}
          title={coverConfig.heading || siteConfig.siteName || ''}
          description={coverConfig.subheading || siteConfig.tagline || ''}
          primaryButton={{
            label: coverConfig.buttonText || 'View my portfolio',
            href: initialPageHref || undefined,
            onClick: initialPageHref ? undefined : () => setComingSoon(true),
          }}
          slideshowHref={null}
          clientFeaturesEnabled={false}
        />
        {comingSoon && !initialPageHref && (
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            <span className="px-4 py-2 text-sm text-white/90 bg-black/40 rounded">Coming soon</span>
          </div>
        )}
      </div>
    )
  }

  const resolvedBlocks = (homePage?.blocks || []).map(block => resolveBlock(block, assetsByUrl))

  const theme = getTheme(siteConfig?.design?.theme)
  const isProvence = theme.id === 'provence'
  const navVariant = theme.navStyle === 'left-rail'
    ? 'left-rail'
    : (homePage?.cover?.imageUrl ? undefined : 'header-dropdown')
  const slideshowHref = homePage?.slideshow?.enabled ? `${basePath}/${homePage.slug || homePage.id}/slideshow` : null

  return (
    <ThemeProvider themeId={theme.id}>
    <div className="min-h-screen bg-white font-sans relative theme-shell">
      <Head>
        <title>{ogTitle}</title>
        {siteConfig.favicon && <link rel="icon" href={siteConfig.favicon} />}
        <meta name="description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Head>
      <SiteAnalytics analytics={siteConfig.analytics} />
      {!isProvence && <SiteNav siteConfig={siteConfig} username={username} basePath={basePath} variant={navVariant} currentPageId={homePage?.id} />}
      <main className="theme-content">
        {homePage ? (
          <ClientEngagementProvider
            username={username}
            pageId={homePage.id}
            pageSlug={homePage.slug || homePage.id}
            clientFeatures={homePage.clientFeatures}
            paymentsReady={printStore.paymentsReady}
            currency={printStore.currency}
            heroPhoto={pageDisplayThumbnail(homePage)}
            heroPresent={!!homePage?.cover?.imageUrl}
            branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '', logoFont: siteConfig.logoFont || 'theme' }}
          >
            {isProvence && (
              <ProvenceHeader
                title={homePage?.title || siteConfig.siteName}
                basePath={basePath}
                pages={siteConfig.pages}
                currentPageId={homePage?.id}
                slideshowHref={slideshowHref}
                startVisible={!homePage?.cover?.imageUrl}
              />
            )}
            <PageCover
              cover={homePage?.cover}
              title={homePage?.title}
              description={homePage?.description}
              slideshowHref={slideshowHref}
              clientFeaturesEnabled={!!homePage?.clientFeatures?.enabled}
              primaryButton={null}
              themeId={theme.id}
              siteName={siteConfig.siteName}
            />
            <Gallery
              name={homePage.title}
              description={homePage.description}
              blocks={resolvedBlocks}
              pages={siteConfig.pages}
              username={username}
              basePath={basePath}
              enableSlideshow={!!slideshowHref}
              onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
              siteConfig={siteConfig}
              printStore={printStore}
              themeId={theme.id}
              hasCover={!!homePage?.cover?.imageUrl}
              coverHeight={homePage?.cover?.height || 'partial'}
              coverButtonStyle={homePage?.cover?.buttonStyle || 'solid'}
            />
          </ClientEngagementProvider>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-1 text-center text-gray-400">
            <span className="text-sm">This site is under construction.</span>
          </div>
        )}
        <SiteFooter siteConfig={siteConfig} />
      </main>
    </div>
    </ThemeProvider>
  )
}
