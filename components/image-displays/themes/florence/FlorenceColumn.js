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
import { resolveVariant, resolvePhotoSize, resolveFont, resolveFlorenceAnchor, resolveButtonStyle, resolveSize, resolveFlorenceFrame } from '../../../../common/themes/variants'
import { captionStyleCss, resolveCaptionStyle } from '../../../../common/captionStyles'

const FL_FRAME_CYCLE = ['mat', 'line']
const FL_MOUNT_HEIGHT = { large: '58vh', medium: '48vh', small: '38vh' }
import { formatCaptureMeta } from '../../../../common/photoMeta'
import VideoBlock from '../../gallery/video-block/VideoBlock'
import ContactDisplay from '../../../contact/ContactDisplay'
import MarkdownText from '../../MarkdownText'
import FlorenceCaption from './FlorenceCaption'
import { FitImg, FitPlaceholder, Overlays } from '../shared/WallFit'

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

export default function FlorenceColumn({ block, blockIndex, onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '', showPlaceholders = false }) {
  const anchor = resolveFlorenceAnchor(block)
  const justify = ANCHOR_JUSTIFY[anchor]
  const metaFor = (o) => formatCaptureMeta(o?.capture, photoMeta, o?.uploadedAt)
  const PH = { placeholder: true }
  // A photo box that renders a placeholder when the image is a placeholder marker,
  // so empty blocks preview the wall layout before any photos are added.
  const photoBox = (img, i) => (
    img?.placeholder
      ? <FitPlaceholder fitClass="florence-fit" />
      : <FitImg img={img} index={i} onImageClick={onImageClick} />
  )
  // The Caption style control (Sans / Serif / Accent) overrides caption typography.
  const capStyle = captionStyleCss(resolveCaptionStyle(block))
  const frame = resolveFlorenceFrame(block)
  // A quiet gallery frame around a photo — a wide mat or a thin keyline — with the
  // caption printed on it. 'mixed' alternates the two across a set.
  const florenceMount = (img, i, height) => {
    const style = frame === 'mixed' ? FL_FRAME_CYCLE[i % FL_FRAME_CYCLE.length] : frame
    const cap = img?.placeholder ? '' : (img.caption || '')
    const m = img?.placeholder ? '' : metaFor(img)
    // A long caption hangs beside the photo's long edge; clamped, click opens the
    // full caption in the lightbox.
    const beside = cap.length > 70
    const openLightbox = beside && onImageClick ? () => onImageClick(i) : undefined
    return (
      <figure key={i} className={`florence-mount florence-mount--${style}`} data-caplayout={beside ? 'beside' : 'below'}>
        <div className="florence-mount__photo" style={{ height }}>
          {photoBox(img, i)}
        </div>
        {(cap || m) && (
          <figcaption className="florence-mount__label" onClick={openLightbox} {...(openLightbox ? { role: 'button', tabIndex: 0, title: cap } : {})}>
            {cap && <span className="florence-mount__title" style={capStyle}>{cap}</span>}
            {m && <span className="florence-mount__meta">{m}</span>}
          </figcaption>
        )}
      </figure>
    )
  }
  const wrap = (cls, style, children, extra = {}) => (
    <section className={`florence-col ${cls}`} data-block-index={blockIndex} data-anchor={anchor} style={style} {...extra} {...hoverProps}>{children}</section>
  )

  switch (block.type) {
    case 'photo': {
      const src = block.image || block.imageUrl
      const hasImg = !!getImageRefUrl(src)
      if (!hasImg && !showPlaceholders) return null
      const imgObj = hasImg
        ? { ...(typeof src === 'object' ? src : { url: src }), caption: block.caption, print: block.print, aspectRatio: block.aspectRatio }
        : PH
      const caption = hasImg ? (block.caption || '') : ''
      const meta = hasImg ? metaFor(block) : ''
      // Fill: the image spans the whole viewport height (top→bottom edges); the
      // section carries no padding so it also reaches the left/right edges, and the
      // block widens to the image. Its plaque overlays the bottom-left.
      if (resolveVariant(block, TID) !== 'centered') {
        return wrap('florence-col--photo florence-col--fill', null, (
          <figure className="florence-figure florence-figure--fill">
            <div className="florence-frame" style={{ height: '100vh' }}>
              {photoBox(imgObj, 0)}
              {(caption || meta) && (
                <figcaption className="florence-fill-label">
                  {caption && <span className="florence-caption__title" style={capStyle}>{caption}</span>}
                  {meta && <span className="florence-caption__meta">{meta}</span>}
                </figcaption>
              )}
            </div>
          </figure>
        ), { 'data-fit': 'full' })
      }
      // Centered: sized by Size, placed vertically by Position, plaque beneath.
      const size = resolvePhotoSize(block, TID)
      if (frame !== 'none') {
        return wrap('florence-col--photo florence-col--framed', { justifyContent: justify },
          florenceMount(imgObj, 0, FL_MOUNT_HEIGHT[size] || FL_MOUNT_HEIGHT.large), { 'data-fit': 'centered' })
      }
      return wrap('florence-col--photo', { justifyContent: justify }, (
        <figure className="florence-figure" style={{ justifyContent: 'center' }}>
          <div className="florence-frame" style={{ flex: '0 0 auto', height: PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large }}>
            {photoBox(imgObj, 0)}
          </div>
          <FlorenceCaption caption={caption} meta={meta} titleStyle={capStyle} />
        </figure>
      ), { 'data-fit': 'centered' })
    }

    case 'photos':
    case 'stacked':
    case 'masonry': {
      let refs = normalizeImageRefs(block.images || block.imageUrls || [])
      if (!refs.length) {
        if (!showPlaceholders) return null
        refs = [PH, PH, PH]
      }
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
                      {photoBox(grp[0], refs.indexOf(grp[0]))}
                    </div>
                  </div>
                )
              }
              // Multi: a fixed-width column of cover-cropped photos; width varies per group.
              return (
                <div key={gi} className="florence-mosaic__group" style={{ width: MOSAIC_GROUP_WIDTHS[gi % MOSAIC_GROUP_WIDTHS.length] }}>
                  {grp.map((img, ci) => {
                    if (img?.placeholder) {
                      return (
                        <div key={ci} className="florence-mosaic__cell">
                          <FitPlaceholder fitClass="florence-fit" />
                        </div>
                      )
                    }
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

      // Framed set: each photo in a gallery mat / keyline (or a rotating mix).
      if (frame !== 'none') {
        const mh = FL_MOUNT_HEIGHT[size] || FL_MOUNT_HEIGHT.large
        return wrap('florence-col--photorow florence-col--framed', { justifyContent: justify }, (
          <div className="florence-row florence-row--framed">
            {refs.map((img, i) => florenceMount(img, i, mh))}
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
                {photoBox(img, i)}
              </div>
              {!img?.placeholder && <FlorenceCaption caption={img.caption || ''} meta={metaFor(img)} titleStyle={capStyle} />}
            </figure>
          ))}
        </div>
      ))
    }

    case 'text': {
      if (!block.content && !showPlaceholders) return null
      const fontFamily = resolveFont(block, TID)
      const fontSize = TEXT_SIZE[resolveVariant(block, TID)] || TEXT_SIZE.body
      // Empty text block: skeleton lines (like the other themes) rather than prose.
      if (!block.content) {
        return wrap('florence-col--text', { justifyContent: justify }, (
          <div className="wall-text-placeholder" aria-hidden>
            <span style={{ width: '82%' }} /><span style={{ width: '94%' }} /><span style={{ width: '58%' }} />
          </div>
        ))
      }
      const content = block.content
      // Long copy would overflow the fixed-height wall column, so it flows into a
      // second column instead of running past the viewport.
      const cols = String(content).length > 280
      // Florence has no distinct heading/quote treatment for text blocks — every
      // markdown node reuses the same "florence-text" look; formatting (bold,
      // links, lists) is what matters here, not new art direction. Markdown keeps
      // the same long-copy column flow as plain text.
      if (block.format === 'markdown') {
        return wrap(`florence-col--text${cols ? ' florence-col--text-cols' : ''}`, cols ? null : { justifyContent: justify }, (
          <div className={`florence-text${cols ? ' florence-text--cols' : ''}`} style={{ fontFamily, fontSize }}>
            <MarkdownText content={content} variantClasses={{ heading: '', body: '', quote: '' }} />
          </div>
        ))
      }
      return wrap(`florence-col--text${cols ? ' florence-col--text-cols' : ''}`, cols ? null : { justifyContent: justify }, (
        <p className={`florence-text${cols ? ' florence-text--cols' : ''}`} style={{ fontFamily, fontSize }}>{content}</p>
      ))
    }

    case 'video': {
      if (!(block.url || '').trim()) return null
      return wrap('florence-col--media', { justifyContent: justify }, (
        <figure className="m-0" style={{ width: 'clamp(320px, 40vw, 640px)' }}>
          <VideoBlock url={block.url} caption="" variant={2} />
          <FlorenceCaption caption={block.caption || ''} titleStyle={capStyle} />
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
