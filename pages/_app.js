// pages/_app.js
import Head from 'next/head'
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'

// Default site metadata. Individual pages (e.g. published photographer sites)
// can override <title>/<meta> by rendering their own next/head tags.
const SITE_NAME = 'Sepia'
const SITE_TITLE = 'Sepia — A platform for photographers'
const SITE_DESC = 'Turn a link into a beautiful photography portfolio in under two minutes. Elegant galleries, music slideshows, and a store — hosted for you.'
const SITE_URL = 'https://sepia.photo'
const OG_IMAGE = `${SITE_URL}/og-image.png`

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>
      <Component {...pageProps} />
    </SessionProvider>
  )
}
