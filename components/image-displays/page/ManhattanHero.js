// components/image-displays/page/ManhattanHero.js
// Manhattan's hero is a thin top strip (an "announcement bar"): optional small
// title + subdued description on the left, action buttons on the right. No cover
// image, no Client Login (password gating happens before page entry).
import { useClientEngagement } from '../engagement/ClientEngagementContext'

function StripButton({ label, href, onClick }) {
  const cls = 'inline-flex items-center px-3.5 py-1.5 text-xs font-sans font-medium transition-colors'
  const style = { border: '1px solid rgba(20,20,20,0.25)', color: 'var(--theme-text, #141414)' }
  if (onClick) return <button type="button" onClick={onClick} className={cls} style={style}>{label}</button>
  const external = href?.startsWith('http')
  return <a href={href || '#'} className={cls} style={style} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
}

export default function ManhattanHero({ title, description, slideshowHref }) {
  const ctx = useClientEngagement()
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (slideshowHref) buttons.push({ label: 'View Music', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'Packages', onClick: () => ctx.openPurchase() })

  if (!title && !description && buttons.length === 0) return null

  return (
    <div data-manhattan-hero className="flex items-start justify-between gap-6 pt-2.5 pb-8">
      <div className="min-w-0">
        {title && <div className="text-[15px] font-sans font-medium tracking-tight" style={{ color: 'var(--theme-text, #141414)' }}>{title}</div>}
        {description && <div className="mt-1 text-[13px] font-sans" style={{ color: 'var(--theme-text-muted, #6b6b6b)' }}>{description}</div>}
      </div>
      {buttons.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {buttons.map((b, i) => <StripButton key={i} label={b.label} href={b.href} onClick={b.onClick} />)}
        </div>
      )}
    </div>
  )
}
