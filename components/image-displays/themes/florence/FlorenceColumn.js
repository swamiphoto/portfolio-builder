// components/image-displays/themes/florence/FlorenceColumn.js
// Renders one gallery block as a section in the Florence horizontal wall. Nothing
// scrolls vertically — every block fits the viewport height and lays its content
// out HORIZONTALLY, extending the wall's left→right scroll.
//   photo        → Full height (image touches the top edge, width grows with it) or
//                  Centered (sized by Size, placed by Position). Plaque beneath.
//   photos       → Row (all photos side by side, captions beneath) or Mosaic (varied
//                  vertical groups of 1/2/3 placed side by side). Size scales height.
//   text         → Fraunces/Mono/Sans (Font), size from L/M/S, placed by Position.
//   video/testimonial/contact/page-gallery → their own columns.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail } from '../../../../common/assetRefs'
import { resolveVariant, resolvePhotoSize, resolveFont, resolveFlorenceAnchor, resolveButtonStyle, resolveSize } from '../../../../common/themes/variants'
import { formatCaptureMeta } from '../../../../common/photoMeta'
import VideoBlock from '../../gallery/video-block/VideoBlock'
import ContactDisplay from '../../../contact/ContactDisplay'
import FlorenceCaption from './FlorenceCaption'
import { FitImg, Overlays } from '../shared/WallFit'

const TID = 'florence'
const ANCHOR_JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' }
// Definite (viewport-based) frame heights — a percentage/flex height can't drive
// the aspect-ratio width during intrinsic sizing, so heights must be concrete.
const PHOTO_HEIGHT = { large: '82vh', medium: '64vh', small: '46vh' }
// Photo sets (Row + Mosaic) share one height scale so a Row reads as tall as the
// Mosaic "mixed" blocks. Large fills the column top-to-bottom (the column's own
// vertical padding is the margin); Medium/Small step down so the Position control
// (top/center/bottom) has real room to move the block.
const WALL_HEIGHT = { large: '84vh', medium: '64vh', small: '46vh' }
const TEXT_SIZE = { heading: 'clamp(1.3rem, 1.7vw, 1.65rem)', subheading: 'clamp(1.12rem, 1.4vw, 1.32rem)', body: 'clamp(1rem, 1.2vw, 1.14rem)' }
const QUOTE_SIZE = { large: 'clamp(1.25rem, 2vw, 1.7rem)', medium: 'clamp(1.05rem, 1.6vw, 1.35rem)', small: 'clamp(0.95rem, 1.3vw, 1.1rem)' }
const MOSAIC_PATTERN = [1, 2, 3, 1, 2]
// Varied widths for multi-photo groups (cycled by group index) so the wall reads
// as a dynamic mosaic rather than uniform columns. Solo photos keep natural width.
const MOSAIC_GROUP_WIDTHS = ['clamp(240px, 26vw, 400px)', 'clamp(190px, 20vw, 300px)', 'clamp(280px, 30vw, 440px)', 'clamp(210px, 23vw, 340px)']

function mosaicGroups(refs) {
  const groups = []
  let i = 0, p = 0
  while (i < refs.length) {
    const n = Math.min(MOSAIC_PATTERN[p % MOSAIC_PATTERN.length], refs.length - i)
    groups.push(refs.slice(i, i + n))
    i += n; p++
  }
  return groups
}

export default function FlorenceColumn({ block, blockIndex, onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '' }) {
  const anchor = resolveFlorenceAnchor(block)
  const justify = ANCHOR_JUSTIFY[anchor]
  const metaFor = (o) => formatCaptureMeta(o?.capture, photoMeta, o?.uploadedAt)
  const wrap = (cls, style, children, extra = {}) => (
    <section className={`florence-col ${cls}`} data-block-index={blockIndex} data-anchor={anchor} style={style} {...extra} {...hoverProps}>{children}</section>
  )

  switch (block.type) {
    case 'photo': {
      const src = block.image || block.imageUrl
      if (!getImageRefUrl(src)) return null
      const imgObj = { ...(typeof src === 'object' ? src : { url: src }), caption: block.caption, print: block.print, aspectRatio: block.aspectRatio }
      const caption = block.caption || ''
      const meta = metaFor(block)
      // Fill: the image spans the whole viewport height (top→bottom edges); the
      // section carries no padding so it also reaches the left/right edges, and the
      // block widens to the image. Its plaque overlays the bottom-left.
      if (resolveVariant(block, TID) !== 'centered') {
        return wrap('florence-col--photo florence-col--fill', null, (
          <figure className="florence-figure florence-figure--fill">
            <div className="florence-frame" style={{ height: '100vh' }}>
              <FitImg img={imgObj} index={0} onImageClick={onImageClick} />
              {(caption || meta) && (
                <figcaption className="florence-fill-label">
                  {caption && <span className="florence-caption__title">{caption}</span>}
                  {meta && <span className="florence-caption__meta">{meta}</span>}
                </figcaption>
              )}
            </div>
          </figure>
        ), { 'data-fit': 'full' })
      }
      // Centered: sized by Size, placed vertically by Position, plaque beneath.
      const size = resolvePhotoSize(block, TID)
      return wrap('florence-col--photo', { justifyContent: justify }, (
        <figure className="florence-figure" style={{ justifyContent: 'center' }}>
          <div className="florence-frame" style={{ flex: '0 0 auto', height: PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large }}>
            <FitImg img={imgObj} index={0} onImageClick={onImageClick} />
          </div>
          <FlorenceCaption caption={caption} meta={meta} />
        </figure>
      ), { 'data-fit': 'centered' })
    }

    case 'photos':
    case 'stacked':
    case 'masonry': {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      if (!refs.length) return null
      const size = resolvePhotoSize(block, TID)

      if (resolveVariant(block, TID) === 'mosaic') {
        const mH = WALL_HEIGHT[size] || WALL_HEIGHT.large
        return wrap('florence-col--mosaic', { justifyContent: justify }, (
          <div className="florence-mosaic" style={{ height: mH }}>
            {mosaicGroups(refs).map((grp, gi) => {
              // Solo: a single big photo at its natural width (definite-height frame,
              // like Row, so the group shrinks to the image — no overlap).
              if (grp.length === 1) {
                return (
                  <div key={gi} className="florence-mosaic__group florence-mosaic__group--solo">
                    <div className="florence-frame" style={{ height: mH }}>
                      <FitImg img={grp[0]} index={refs.indexOf(grp[0])} onImageClick={onImageClick} />
                    </div>
                  </div>
                )
              }
              // Multi: a fixed-width column of cover-cropped photos; width varies per group.
              return (
                <div key={gi} className="florence-mosaic__group" style={{ width: MOSAIC_GROUP_WIDTHS[gi % MOSAIC_GROUP_WIDTHS.length] }}>
                  {grp.map((img, ci) => {
                    const url = getImageRefUrl(img) || img.url || img
                    return (
                      <div key={ci} className="florence-mosaic__cell relative group">
                        <img src={getSizedUrl(url, 'display')} alt={img.caption || 'Photo'} loading="lazy" onClick={() => onImageClick?.(refs.indexOf(img))} />
                        <Overlays url={url} print={img.print} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))
      }

      // Row (default): all photos side by side, each at the row height, plaque beneath.
      const rowH = WALL_HEIGHT[size] || WALL_HEIGHT.large
      return wrap('florence-col--photorow', { justifyContent: justify }, (
        <div className="florence-row">
          {refs.map((img, i) => (
            <figure key={i} className="florence-row__item m-0">
              <div className="florence-frame" style={{ height: rowH }}>
                <FitImg img={img} index={i} onImageClick={onImageClick} />
              </div>
              <FlorenceCaption caption={img.caption || ''} meta={metaFor(img)} />
            </figure>
          ))}
        </div>
      ))
    }

    case 'text': {
      if (!block.content) return null
      const fontFamily = resolveFont(block, TID)
      const fontSize = TEXT_SIZE[resolveVariant(block, TID)] || TEXT_SIZE.body
      return wrap('florence-col--text', { justifyContent: justify }, (
        <p className="florence-text" style={{ fontFamily, fontSize }}>{block.content}</p>
      ))
    }

    case 'video': {
      if (!(block.url || '').trim()) return null
      return wrap('florence-col--media', { justifyContent: justify }, (
        <figure className="m-0" style={{ width: 'clamp(320px, 40vw, 640px)' }}>
          <VideoBlock url={block.url} caption="" variant={2} />
          <FlorenceCaption caption={block.caption || ''} />
        </figure>
      ))
    }

    case 'testimonial': {
      const photoUrl = getImageRefUrl(block.image || block.imageUrl)
      if (!block.text && !block.name && !photoUrl) return null
      const fontFamily = resolveFont(block, TID)
      const italic = block.quoteStyle !== 'regular'
      const fontSize = QUOTE_SIZE[resolveSize(block, TID)] || QUOTE_SIZE.large
      const photoAbove = resolveVariant(block, TID) === 'photo-above'
      const quote = block.text && (
        <blockquote className="florence-testimonial__quote" style={{ fontFamily, fontStyle: italic ? 'italic' : 'normal', fontSize }}>{block.text}</blockquote>
      )
      const by = (photoUrl || block.name) && (
        <figcaption className="florence-testimonial__by">
          {photoUrl && <img className="florence-testimonial__avatar" src={getSizedUrl(photoUrl, 'display')} alt={block.name || ''} />}
          {block.name && <span>{block.name}</span>}
        </figcaption>
      )
      return wrap('florence-col--text florence-col--testimonial', { justifyContent: justify }, (
        // photo-above → byline (with avatar) first, then the quote; quote-above → quote, then byline.
        <figure className="florence-testimonial m-0">
          {photoAbove ? <>{by}{quote}</> : <>{quote}{by}</>}
        </figure>
      ))
    }

    case 'contact': {
      return wrap('florence-col--contact', { justifyContent: justify }, (
        <ContactDisplay
          heading={block.heading}
          subheading={block.subheading}
          buttonText={block.buttonText}
          toEmail={siteConfig?.contact?.email}
          align="left"
          buttonStyle={resolveButtonStyle(block, TID)}
        />
      ))
    }

    case 'page-gallery': {
      const linked = (block.pageIds || []).map(id => (pages || []).find(p => p.id === id)).filter(Boolean)
      if (!linked.length) return null
      return wrap('florence-col--pagelinks', { justifyContent: justify }, (
        <div className="florence-row" style={{ height: WALL_HEIGHT.medium }}>
          {linked.map((p) => {
            const thumb = pageDisplayThumbnail(p)
            const href = `${basePath}/${p.slug || p.id}`
            return (
              <a key={p.id} className="florence-pagelink" href={href}>
                <div className="florence-pagelink__frame">
                  {thumb && <img src={getSizedUrl(thumb, 'display')} alt={p.title || ''} loading="lazy" />}
                </div>
                <span className="florence-pagelink__title">{p.title}</span>
              </a>
            )
          })}
        </div>
      ))
    }

    default:
      return null
  }
}
