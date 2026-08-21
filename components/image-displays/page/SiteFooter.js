// components/image-displays/page/SiteFooter.js
import { resolveFooterSocial, socialHref, SOCIAL_KEYS } from '../../../common/siteDesign'
import { SOCIAL_ICONS } from './SocialIcons'
import { useTheme } from '../ThemeProvider'
import { useIsMobile } from '../../../common/useIsMobile'

const CG = '"Cormorant Garamond", "Cormorant", Georgia, serif'
const LABELS = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter', tiktok: 'TikTok', youtube: 'YouTube', website: 'Website' }

export default function SiteFooter({ siteConfig }) {
  const theme = useTheme()
  const isMobile = useIsMobile()
  // Left-rail themes (Copenhagen) render the footer + socials at the bottom of the
  // rail on desktop, so skip the content-column footer there to avoid a duplicate.
  // On phones there is no rail, so the content footer stays.
  if (theme?.navStyle === 'left-rail' && !isMobile) return null

  const socialMode = resolveFooterSocial(siteConfig) // 'off' | 'text' | 'icons'

  const custom = siteConfig?.footer?.customText
  const name = siteConfig?.siteName || ''
  const text = custom || `© ${new Date().getFullYear()} ${name}`.trim()

  const contact = siteConfig?.contact || {}
  const socials = socialMode === 'off'
    ? []
    : SOCIAL_KEYS.map(k => ({ k, href: socialHref(k, contact[k]) })).filter(s => s.href)

  if (!text && socials.length === 0) return null

  // Blantyre keeps the footer in its typewriter voice; every other theme stays serif.
  const isBlantyre = theme?.id === 'blantyre'

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        fontFamily: isBlantyre ? '"Roboto Mono", "Geist Mono", ui-monospace, monospace' : CG,
        fontSize: isBlantyre ? '0.75rem' : '1rem',
        letterSpacing: isBlantyre ? '0.05em' : '0.01em',
        color: 'var(--theme-text-muted, #7a6b55)',
      }}
    >
      {socials.length > 0 && socialMode === 'icons' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.1rem' }}>
          {socials.map(({ k, href }) => {
            const Icon = SOCIAL_ICONS[k]
            return (
              <a
                key={k}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={LABELS[k]}
                style={{ color: 'inherit', display: 'inline-flex', opacity: 0.85 }}
              >
                {Icon ? <Icon size={18} /> : LABELS[k]}
              </a>
            )
          })}
        </div>
      )}
      {socials.length > 0 && socialMode === 'text' && (
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
