import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Default favicons moved to _app's next/head (keyed) so a published site's
            own custom favicon can OVERRIDE them by key — a plain <link> here can't be
            deduped by the page and the sized PNGs would otherwise beat the custom one. */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2e1e12" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Italianno&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Schibsted+Grotesk:wght@400;500;600;700&family=Geist+Mono:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Abril+Fatface&family=Anton&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Marcellus&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
