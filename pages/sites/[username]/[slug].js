// pages/sites/[username]/[slug].js
import { useState } from 'react'
import Head from 'next/head'
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { resolveCaption } from '../../../common/captionResolver'
import { publicPrintForAsset, publicPrintStore, publicSiteConfig } from '../../../common/print/publicPrint'
import { siteUrlFor, basePathFor } from '../../../common/domainUtils'
import Gallery from '../../../components/image-displays/gallery/Gallery'
import PageCover from '../../../components/image-displays/page/PageCover'
import SiteNav from '../../../components/image-displays/page/SiteNav'
import SiteFooter from '../../../components/image-displays/page/SiteFooter'
import PasswordGate from '../../../components/image-displays/page/PasswordGate'
import ThemeProvider from '../../../components/image-displays/ThemeProvider'
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
      page: JSON.parse(JSON.stringify(page)),
      assetsByUrl,
      printStore,
      username,
      basePath,
    },
  }
}

export default function PublicPage({ siteConfig, page, assetsByUrl, printStore, username, basePath }) {
  // Client-side gate only — not a security boundary. Real protection lives in clientFeatures.
  const [unlocked, setUnlocked] = useState(!page.password)
  if (!unlocked) {
    return <PasswordGate pageTitle={page.title} message={page.passwordGateMessage} onUnlock={(v) => { if (v === page.password) { setUnlocked(true); return true } return false }} />
  }

  const ogImage = page.thumbnail?.imageUrl || siteConfig.share?.largeImage || siteConfig.cover?.imageUrl || ''
  const ogTitle = page.title || siteConfig.siteName || 'Portfolio'
  const ogDescription = page.description || siteConfig.tagline || ''
  const siteUrl = siteUrlFor(siteConfig, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
  const pageUrl = `${siteUrl}/${page.slug || page.id}`

  const resolvedBlocks = (page.blocks || []).map(b => resolveBlock(b, assetsByUrl))
  const theme = getTheme(siteConfig?.design?.theme)
  const navVariant = theme.navStyle === 'left-rail'
    ? 'left-rail'
    : (page?.cover?.imageUrl ? undefined : 'header-dropdown')
  const slideshowHref = page.slideshow?.enabled ? `${basePath}/${page.slug || page.id}/slideshow` : null
  // Sub-nav: if this page has a parent, show siblings. If it has children, show children.
  const allPages = siteConfig.pages || []
  const isChildPage = !!page.parentId
  const subNavPages = isChildPage
    ? allPages.filter(p => p.parentId === page.parentId && p.showInNav !== false)
    : allPages.filter(p => p.parentId === page.id && p.showInNav !== false)
  const activeSubNavId = isChildPage ? page.id : null
  const hasCover = !!page.cover?.imageUrl
  const coverNavLinks = hasCover
    ? subNavPages.map(p => ({ label: p.title, href: `${basePath}/${p.slug || p.id}` }))
    : []
  return (
    <ThemeProvider themeId={theme.id}>
    <div className="min-h-screen bg-white font-sans relative theme-shell">
      <Head>
        <title>{ogTitle}</title>
        {siteConfig.favicon && <link rel="icon" href={siteConfig.favicon} />}
        <meta name="description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Head>
      <SiteNav siteConfig={siteConfig} username={username} basePath={basePath} variant={navVariant} currentPageId={page.id} />
      <main className="theme-content">
        <ClientEngagementProvider
          username={username}
          pageId={page.id}
          pageSlug={page.slug || page.id}
          clientFeatures={page.clientFeatures}
          paymentsReady={printStore.paymentsReady}
          currency={printStore.currency}
          heroPhoto={pageDisplayThumbnail(page)}
          heroPresent={hasCover}
          branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '', logoFont: siteConfig.logoFont || 'theme' }}
        >
          <PageCover
            cover={page.cover}
            title={page.title}
            description={page.description}
            slideshowHref={slideshowHref}
            clientFeaturesEnabled={!!page.clientFeatures?.enabled}
            navLinks={coverNavLinks}
          />
          <Gallery
            name={page.title}
            description={page.description}
            blocks={resolvedBlocks}
            pages={siteConfig.pages}
            childPages={subNavPages}
            activeChildId={activeSubNavId}
            username={username}
            basePath={basePath}
            enableSlideshow={!!slideshowHref}
            onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
            siteConfig={siteConfig}
            printStore={printStore}
            coverHeight={page.cover?.height || 'partial'}
            coverButtonStyle={page.cover?.buttonStyle || 'solid'}
            themeId={theme.id}
            hasCover={hasCover}
          />
        </ClientEngagementProvider>
        <SiteFooter siteConfig={siteConfig} />
      </main>
    </div>
    </ThemeProvider>
  )
}
