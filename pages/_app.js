// pages/_app.js
import Head from 'next/head'
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'

// Default site metadata. Individual pages (e.g. published photographer sites)
// can override <title>/<meta> by rendering their own next/head tags.
const SITE_NAME = 'Sepia'
const SITE_TITLE = 'Sepia — Show and sell your photography'
const SITE_DESC = 'Build your beautiful photography portfolio in minutes, with museum-style galleries, music slideshows, one-click prints, and client galleries that get you paid.'
const SITE_URL = 'https://www.sepia.photo'
// Bump the version query whenever og-image.png changes so scrapers (FB/LinkedIn/
// Twitter) fetch fresh bytes instead of serving a stale cached preview.
const OG_IMAGE = `${SITE_URL}/og-image.png?v=3`

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      {/* Default Sepia metadata. Every overridable tag carries a `key` so a
          published site page (via <PageMeta>) dedupes and overrides it, instead of
          both tags rendering and scrapers picking this default card. */}
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title key="title">{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESC} key="description" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:title" content={SITE_TITLE} key="og:title" />
        <meta property="og:description" content={SITE_DESC} key="og:description" />
        <meta property="og:url" content={SITE_URL} key="og:url" />
        <meta property="og:image" content={OG_IMAGE} key="og:image" />
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={SITE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={SITE_DESC} key="twitter:description" />
        <meta name="twitter:image" content={OG_IMAGE} key="twitter:image" />
      </Head>
      <Component {...pageProps} />
    </SessionProvider>
  )
}
