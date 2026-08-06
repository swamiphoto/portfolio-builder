import Head from 'next/head'
import Link from 'next/link'

// Shared shell for the Privacy and Terms pages: a centered, readable prose
// column in the Sepia palette. Body content is passed as children.
export default function LegalDoc({ title, lastUpdated, children }) {
  return (
    <>
      <Head>
        <title>{title} · Sepia</title>
        <meta name="robots" content="index,follow" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#faf7f0', color: '#1a1410' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>
          <Link href="/" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, color: '#1a1410', textDecoration: 'none' }}>
            Sepia
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 34, fontWeight: 500, margin: '32px 0 6px', lineHeight: 1.15 }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: '#9e9788', margin: '0 0 40px' }}>Last updated: {lastUpdated}</p>
          <div className="legal-prose" style={{ fontSize: 15, lineHeight: 1.7, color: '#3a362f' }}>
            {children}
          </div>
          <div style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid rgba(160,140,110,0.28)', fontSize: 13, color: '#9e9788' }}>
            <Link href="/" style={{ color: '#8b6f47', textDecoration: 'none' }}>← Back to Sepia</Link>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .legal-prose h2 { font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 500; color: #1a1410; margin: 34px 0 10px; }
        .legal-prose p { margin: 0 0 14px; }
        .legal-prose ul { margin: 0 0 14px; padding-left: 20px; }
        .legal-prose li { margin: 0 0 6px; }
        .legal-prose a { color: #8b6f47; }
        .legal-prose strong { color: #1a1410; }
      `}</style>
    </>
  )
}
