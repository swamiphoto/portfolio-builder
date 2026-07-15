// components/image-displays/page/SiteFooter.js
import { resolveFooter, socialHref, SOCIAL_KEYS } from '../../../common/siteDesign'

const CG = '"Cormorant Garamond", "Cormorant", Georgia, serif'
const LABELS = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter', tiktok: 'TikTok', youtube: 'YouTube', website: 'Website' }

export default function SiteFooter({ siteConfig }) {
  const { hidden, layout } = resolveFooter(siteConfig)
  if (hidden) return null

  const custom = siteConfig?.footer?.customText
  const name = siteConfig?.siteName || ''
  const text = custom || `© ${new Date().getFullYear()} ${name}`.trim()

  const contact = siteConfig?.contact || {}
  const socials = layout === 'expanded'
    ? SOCIAL_KEYS.map(k => ({ k, href: socialHref(k, contact[k]) })).filter(s => s.href)
    : []

  if (!text && socials.length === 0) return null

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
      {socials.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.75rem', marginBottom: '1rem' }}>
          {socials.map(({ k, href }) => (
            <a
              key={k}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              {LABELS[k]}
            </a>
          ))}
        </div>
      )}
      {text && <div>{text}</div>}
    </footer>
  )
}
