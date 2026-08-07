import Script from 'next/script'

// Injects the photographer's own analytics into their PUBLISHED site only.
// IDs are validated to a safe character set so a config value can never break
// out of the inline gtag snippet or the Plausible data attribute.
const GA_ID_RE = /^(G|UA|GT|AW|DC)-[A-Za-z0-9-]+$/
const DOMAIN_RE = /^[A-Za-z0-9.-]+$/

// Pure: returns the safe, validated ids to inject (or null each). Exported so the
// validation can be tested without rendering next/script.
export function resolveAnalytics(analytics) {
  const googleId = (analytics?.googleId || '').trim()
  const plausibleDomain = (analytics?.plausibleDomain || '').trim()
  return {
    ga: GA_ID_RE.test(googleId) ? googleId : null,
    plausible: DOMAIN_RE.test(plausibleDomain) ? plausibleDomain : null,
  }
}

export default function SiteAnalytics({ analytics }) {
  const { ga, plausible } = resolveAnalytics(analytics)
  if (!ga && !plausible) return null

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="sepia-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {plausible && (
        <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
      )}
    </>
  )
}
