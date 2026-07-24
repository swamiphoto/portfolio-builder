// components/image-displays/page/ManhattanHero.js
// Manhattan has no top hero — the active left-rail link already names the page.
// The only site actions (View Music / Packages) live in a slim bar pinned to the
// bottom of the content column. No Client Login (password gating happens before
// page entry). Renders nothing when there are no actions.
import { useClientEngagement } from '../engagement/ClientEngagementContext'

function BarButton({ label, href, onClick }) {
  // Square (no rounded corners), sans-serif, small — the Manhattan button style.
  const cls = 'inline-flex items-center px-4 py-2 text-xs font-sans font-medium tracking-wide transition-colors'
  const style = { border: '1px solid rgba(20,20,20,0.28)', color: 'var(--theme-text, #141414)', background: 'transparent' }
  if (onClick) return <button type="button" onClick={onClick} className={cls} style={style}>{label}</button>
  const external = href?.startsWith('http')
  return <a href={href || '#'} className={cls} style={style} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
}

export default function ManhattanHero({ slideshowHref }) {
  const ctx = useClientEngagement()
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (slideshowHref) buttons.push({ label: 'View Music', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'View Packages', onClick: () => ctx.openPurchase() })

  if (buttons.length === 0) return null

  return (
    <div data-manhattan-hero className="manhattan-actionbar">
      {buttons.map((b, i) => <BarButton key={i} label={b.label} href={b.href} onClick={b.onClick} />)}
    </div>
  )
}
