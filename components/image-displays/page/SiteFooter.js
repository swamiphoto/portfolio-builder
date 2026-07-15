// components/image-displays/page/SiteFooter.js
// Basic footer shown on every page: centered text in Cormorant Garamond.
const CG = '"Cormorant Garamond", "Cormorant", Georgia, serif'

export default function SiteFooter({ siteConfig }) {
  const custom = siteConfig?.footer?.customText
  const name = siteConfig?.siteName || ''
  const text = custom || `© ${new Date().getFullYear()} ${name}`.trim()
  if (!text) return null
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        fontFamily: CG,
        fontSize: '1rem',
        letterSpacing: '0.01em',
        color: 'var(--theme-text-muted, #7a6b55)',
      }}
    >
      {text}
    </footer>
  )
}
