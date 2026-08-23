// components/PageMeta.js
// Per-page <head> for published sites. Every tag carries a `key` so it dedupes
// against the Sepia defaults in _app.js (same key → the page's tag wins) — without
// keys, next/head renders BOTH and scrapers pick the default Sepia card.
//
// `title` is the browser-tab title (e.g. "Canals — Van der Meer"); `ogTitle` is the
// share-card title (the bare page/gallery name). `image` should be an absolute URL.
import Head from 'next/head'

export default function PageMeta({ title, ogTitle, description = '', image = '', url = '', siteName = 'Sepia', type = 'website', favicon }) {
  const shareTitle = ogTitle || title
  const twitterCard = image ? 'summary_large_image' : 'summary'
  return (
    <Head>
      <title key="title">{title}</title>
      {/* Override every default icon slot (same keys as _app) so the site's custom
          favicon replaces the Sepia defaults rather than competing with them. */}
      {favicon && <link rel="icon" href={favicon} sizes="any" key="favicon-ico" />}
      {favicon && <link rel="icon" href={favicon} key="favicon-32" />}
      {favicon && <link rel="icon" href={favicon} key="favicon-16" />}
      {favicon && <link rel="apple-touch-icon" href={favicon} key="apple-touch" />}
      <meta name="description" content={description} key="description" />
      <meta property="og:type" content={type} key="og:type" />
      <meta property="og:site_name" content={siteName} key="og:site_name" />
      {url && <meta property="og:url" content={url} key="og:url" />}
      <meta property="og:title" content={shareTitle} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      {image && <meta property="og:image" content={image} key="og:image" />}
      <meta name="twitter:card" content={twitterCard} key="twitter:card" />
      <meta name="twitter:title" content={shareTitle} key="twitter:title" />
      <meta name="twitter:description" content={description} key="twitter:description" />
      {image && <meta name="twitter:image" content={image} key="twitter:image" />}
    </Head>
  )
}
