// components/image-displays/page/ProvenceCover.js
// Provence's signature: a split-screen cover. A cream text panel (studio eyebrow,
// serif title, tracked-caps meta line, and a row of CTAs) sits beside a full-bleed
// photo, split by a hairline. On phones it stacks — photo, then panel. A CTA with
// no href/onClick scrolls down into the gallery.
import { getSizedUrl } from '../../../common/imageUtils'

export function scrollToGallery() {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }
}

function CoverButton({ label, href, onClick, style }) {
  const cls = `provence-cover__btn ${style === 'outline' ? 'provence-cover__btn--outline' : ''}`
  if (href) {
    const external = href.startsWith('http')
    return <a className={cls} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
  }
  return <button type="button" className={cls} onClick={onClick || scrollToGallery}>{label}</button>
}

export default function ProvenceCover({ title, description, eyebrow, imageUrl, buttons = [] }) {
  if (!imageUrl) return null
  const list = buttons.length ? buttons : [{ label: 'View Gallery', style: 'solid' }]

  return (
    <section className="provence-cover">
      <div className="provence-cover__panel">
        {eyebrow && <div className="provence-cover__eyebrow">{eyebrow}</div>}
        {title && <h1 className="provence-cover__title">{title}</h1>}
        {description && <div className="provence-cover__meta">{description}</div>}
        <div className="provence-cover__actions">
          {list.map((b, i) => (
            <CoverButton key={i} label={b.label} href={b.href} onClick={b.onClick} style={b.style} />
          ))}
        </div>
      </div>
      <div className="provence-cover__photo">
        <img src={getSizedUrl(imageUrl, 'display') || imageUrl} alt={title || ''} />
      </div>
    </section>
  )
}
