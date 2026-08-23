import { useState } from 'react'
import PageMeta from '../../../components/PageMeta'
import { lookupUserByUsername } from '../../../common/userProfile'
import { resolveHomePage } from '../../../common/homePage'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveCaption } from '../../../common/captionResolver'
import { heroTitleFor } from '../../../common/pageUtils'
import { publicCaptureForAsset } from '../../../common/photoMeta'
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
import { getPageTheme } from '../../../common/themes'
import { fontFamilyForSlot } from '../../../common/themes/variants'
import { ClientEngagementProvider } from '../../../components/image-displays/engagement/ClientEngagementContext'
import { pageDisplayThumbnail } from '../../../common/assetRefs'
import { useIsMobile } from '../../../common/useIsMobile'

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    const entry = assetsByUrl[block.imageUrl]
    const resolved = { ...block, caption: resolveCaption(ref, assetsByUrl) }
    if (entry?.print) resolved.print = entry.print
    if (entry?.capture) resolved.capture = entry.capture
    if (entry?.uploadedAt) resolved.uploadedAt = entry.uploadedAt
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
      if (entry?.capture) out.capture = entry.capture
      if (entry?.uploadedAt) out.uploadedAt = entry.uploadedAt
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
    const capture = publicCaptureForAsset(a)
    if (capture) entry.capture = capture
    if (a.createdAt) entry.uploadedAt = a.createdAt
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
  const siteName = siteConfig.siteName || 'Sepia'
  const ogTitle = siteName
  const ogDescription = siteConfig.tagline || ''
  const siteUrl = siteUrlFor(siteConfig, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
  const metaTag = (
    <PageMeta title={siteName} ogTitle={siteName} description={ogDescription} image={ogImage} url={siteUrl} siteName={siteName} favicon={siteConfig.favicon} />
  )

  const homePage = resolveHomePage(siteConfig)
  const hasCoverPage = siteConfig.hasCoverPage !== false
  const coverConfig = siteConfig.cover || {}
  const initialPageHref = homePage ? `${basePath}/${homePage.slug || homePage.id}` : null
  const [comingSoon, setComingSoon] = useState(false)

  const [unlocked, setUnlocked] = useState(!homePage?.password)
  const isMobile = useIsMobile()
  if (!unlocked) {
    return <PasswordGate pageTitle={homePage?.title || 'Protected'} message={homePage?.passwordGateMessage} onUnlock={(v) => { if (v === homePage.password) { setUnlocked(true); return true } return false }} />
  }

  if (hasCoverPage) {
    return (
      <div className="min-h-screen bg-[#33261a] font-sans relative">
        {metaTag}
        <SiteAnalytics analytics={siteConfig.analytics} />
        <PageCover
          cover={{
            ...coverConfig,
            imageUrl: coverConfig.imageUrl || '',
            height: coverConfig.height || 'full',
            variant: 'cover',
            buttonStyle: coverConfig.buttonStyle || 'solid',
          }}
          title={coverConfig.heading || siteConfig.siteName || ''}
          description={coverConfig.subheading || siteConfig.tagline || ''}
          siteName={siteConfig.siteName}
          logo={siteConfig.logoType === 'image' ? siteConfig.logo : ''}
          titleFontFamily={fontFamilyForSlot(siteConfig?.design?.theme, coverConfig.titleFont || 'serif')}
          descriptionFontFamily={fontFamilyForSlot(siteConfig?.design?.theme, coverConfig.descriptionFont || 'serif')}
          buttonFontFamily={fontFamilyForSlot(siteConfig?.design?.theme, coverConfig.buttonFont || coverConfig.titleFont || 'sans')}
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

  // The home page can override the site theme for itself only (page.themeOverride).
  const theme = getPageTheme(siteConfig, homePage)
  const isProvence = theme.id === 'provence'
  // Florence owns its own rail inside the gallery (FlorenceWall), so no SiteNav.
  const isFlorence = theme.id === 'florence'
  // Amsterdam owns its own rail inside the gallery (AmsterdamWall), so no SiteNav.
  const isAmsterdam = theme.id === 'amsterdam'
  const navVariant = theme.navStyle === 'left-rail'
    ? 'left-rail'
    : (homePage?.cover?.imageUrl ? undefined : 'header-dropdown')
  const slideshowHref = homePage?.slideshow?.enabled ? `${basePath}/${homePage.slug || homePage.id}/slideshow` : null

  return (
    <ThemeProvider themeId={theme.id}>
    <div className="min-h-screen bg-white font-sans relative theme-shell" data-viewport={isMobile ? 'mobile' : 'desktop'}>
      {metaTag}
      <SiteAnalytics analytics={siteConfig.analytics} />
      {/* On mobile every theme uses the shared hamburger nav. Provence keeps its
          bespoke split-cover header only on desktop. */}
      {!isFlorence && !isAmsterdam && (!isProvence || isMobile) && <SiteNav siteConfig={siteConfig} username={username} basePath={basePath} variant={navVariant} themeId={theme.id} currentPageId={homePage?.id} />}
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
            {isProvence && !isMobile && (
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
              title={heroTitleFor(homePage)}
              description={homePage?.description}
              slideshowHref={slideshowHref}
              clientFeaturesEnabled={!!homePage?.clientFeatures?.enabled}
              primaryButton={null}
              themeId={theme.id}
              siteName={siteConfig.siteName}
            />
            <Gallery
              name={heroTitleFor(homePage)}
              description={homePage.description}
              blocks={resolvedBlocks}
              pages={siteConfig.pages}
              currentPageId={homePage?.id}
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
              cover={homePage?.cover}
              opener="hero"
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
