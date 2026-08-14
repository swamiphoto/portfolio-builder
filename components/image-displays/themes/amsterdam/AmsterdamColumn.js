// components/image-displays/themes/amsterdam/AmsterdamColumn.js
// Renders one gallery block as a column in the Amsterdam poster wall. Nothing
// scrolls vertically — every block fits the viewport height and extends the
// wall's left→right scroll.
//   photo        → Fill (edge-to-edge height, default) or Centered (Size + plaque).
//   photos       → Row (side by side, captions beneath) or Mosaic (groups of 1/2/3).
//   text         → Panel (full-height ink column, Display type) or Quiet (cream
//                  museum label) via block.amsterdamStyle; L/M/S from the variant.
//   video/testimonial/contact/page-gallery → their own columns.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail } from '../../../../common/assetRefs'
import { resolveVariant, resolvePhotoSize, resolveFont, resolveButtonStyle, resolveSize, resolveQuoteStyle, resolveAmsterdamStyle } from '../../../../common/themes/variants'
import { formatCaptureMeta } from '../../../../common/photoMeta'
import { FitImg, Overlays } from '../shared/WallFit'
import VideoBlock from '../../gallery/video-block/VideoBlock'
import ContactDisplay from '../../../contact/ContactDisplay'
import AmsterdamCaption from './AmsterdamCaption'

const TID = 'amsterdam'
const PHOTO_HEIGHT = { large: '82vh', medium: '64vh', small: '46vh' }
const ROW_HEIGHT = { large: '62vh', medium: '50vh', small: '38vh' }
const MOSAIC_HEIGHT = { large: '84vh', medium: '66vh', small: '50vh' }
const MOSAIC_PATTERN = [1, 2, 3, 1, 2]
const MOSAIC_GROUP_WIDTHS = ['clamp(240px, 26vw, 400px)', 'clamp(190px, 20vw, 300px)', 'clamp(280px, 30vw, 440px)', 'clamp(210px, 23vw, 340px)']
// Panel text is poster-scaled; Quiet matches the museum-label register.
const PANEL_SIZE = { heading: 'clamp(2.6rem, 4.4vw, 5rem)', subheading: 'clamp(1.9rem, 3vw, 3.4rem)', body: 'clamp(1.15rem, 1.6vw, 1.5rem)' }
const QUIET_SIZE = { heading: 'clamp(1.3rem, 1.7vw, 1.65rem)', subheading: 'clamp(1.12rem, 1.4vw, 1.32rem)', body: 'clamp(1rem, 1.2vw, 1.14rem)' }
const QUOTE_SIZE = { large: 'clamp(1.4rem, 2.2vw, 1.9rem)', medium: 'clamp(1.15rem, 1.7vw, 1.5rem)', small: 'clamp(1rem, 1.4vw, 1.2rem)' }

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

export default function AmsterdamColumn({ block, blockIndex, onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '' }) {
  const metaFor = (o) => formatCaptureMeta(o?.capture, photoMeta, o?.uploadedAt)
  const wrap = (cls, style, children, extra = {}) => (
    <section className={`ams-col ${cls}`} data-block-index={blockIndex} style={style} {...extra} {...hoverProps}>{children}</section>
  )

  switch (block.type) {
    case 'photo': {
      const src = block.image || block.imageUrl
      if (!getImageRefUrl(src)) return null
      const imgObj = { ...(typeof src === 'object' ? src : { url: src }), caption: block.caption, print: block.print, aspectRatio: block.aspectRatio }
      const caption = block.caption || ''
      const meta = metaFor(block)
      if (resolveVariant(block, TID) !== 'centered') {
        return wrap('ams-col--photo ams-col--fill', null, (
          <figure className="ams-figure ams-figure--fill">
            <div className="ams-frame" style={{ height: '100vh' }}>
              <FitImg img={imgObj} index={0} onImageClick={onImageClick} fitClass="ams-fit" />
              {(caption || meta) && (
                <figcaption className="ams-fill-label">
                  {caption && <span className="ams-caption__title">{caption}</span>}
                  {meta && <span className="ams-caption__meta">{meta}</span>}
                </figcaption>
              )}
            </div>
          </figure>
        ))
      }
      const size = resolvePhotoSize(block, TID)
      return wrap('ams-col--photo', null, (
        <figure className="ams-figure">
          <div className="ams-frame" style={{ flex: '0 0 auto', height: PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large }}>
            <FitImg img={imgObj} index={0} onImageClick={onImageClick} fitClass="ams-fit" />
          </div>
          <AmsterdamCaption caption={caption} meta={meta} />
        </figure>
      ))
    }

    case 'photos':
    case 'stacked':
    case 'masonry': {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      if (!refs.length) return null
      const size = resolvePhotoSize(block, TID)

      if (resolveVariant(block, TID) === 'mosaic') {
        const mH = MOSAIC_HEIGHT[size] || MOSAIC_HEIGHT.large
        return wrap('ams-col--mosaic', null, (
          <div className="ams-mosaic" style={{ height: mH }}>
            {mosaicGroups(refs).map((grp, gi) => {
              if (grp.length === 1) {
                return (
                  <div key={gi} className="ams-mosaic__group ams-mosaic__group--solo">
                    <div className="ams-frame" style={{ height: mH }}>
                      <FitImg img={grp[0]} index={refs.indexOf(grp[0])} onImageClick={onImageClick} fitClass="ams-fit" />
                    </div>
                  </div>
                )
              }
              return (
                <div key={gi} className="ams-mosaic__group" style={{ width: MOSAIC_GROUP_WIDTHS[gi % MOSAIC_GROUP_WIDTHS.length] }}>
                  {grp.map((img, ci) => {
                    const url = getImageRefUrl(img) || img.url || img
                    return (
                      <div key={ci} className="ams-mosaic__cell relative group">
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

      const rowH = ROW_HEIGHT[size] || ROW_HEIGHT.large
      return wrap('ams-col--photorow', null, (
        <div className="ams-row">
          {refs.map((img, i) => (
            <figure key={i} className="ams-row__item m-0">
              <div className="ams-frame" style={{ height: rowH }}>
                <FitImg img={img} index={i} onImageClick={onImageClick} fitClass="ams-fit" />
              </div>
              <AmsterdamCaption caption={img.caption || ''} meta={metaFor(img)} />
            </figure>
          ))}
        </div>
      ))
    }

    case 'text': {
      if (!block.content) return null
      const fontFamily = resolveFont(block, TID)
      const variant = resolveVariant(block, TID)
      if (resolveAmsterdamStyle(block) === 'quiet') {
        return wrap('ams-col--quiet', null, (
          <p className="ams-quiet__text" style={{ fontFamily, fontSize: QUIET_SIZE[variant] || QUIET_SIZE.body }}>{block.content}</p>
        ))
      }
      return wrap('ams-col--panel', null, (
        <p className="ams-panel__text" style={{ fontFamily, fontSize: PANEL_SIZE[variant] || PANEL_SIZE.body }}>{block.content}</p>
      ))
    }

    case 'video': {
      if (!(block.url || '').trim()) return null
      return wrap('ams-col--media', null, (
        <figure className="m-0" style={{ width: 'clamp(320px, 40vw, 640px)' }}>
          <VideoBlock url={block.url} caption="" variant={2} />
          <AmsterdamCaption caption={block.caption || ''} />
        </figure>
      ))
    }

    case 'testimonial': {
      const photoUrl = getImageRefUrl(block.image || block.imageUrl)
      if (!block.text && !block.name && !photoUrl) return null
      const fontFamily = resolveFont(block, TID)
      const italic = resolveQuoteStyle(block, TID) === 'italic'
      const fontSize = QUOTE_SIZE[resolveSize(block, TID)] || QUOTE_SIZE.large
      const photoAbove = resolveVariant(block, TID) === 'photo-above'
      const quote = block.text && (
        <blockquote className="ams-testimonial__quote" style={{ fontFamily, fontStyle: italic ? 'italic' : 'normal', fontSize }}>{block.text}</blockquote>
      )
      const by = (photoUrl || block.name) && (
        <figcaption className="ams-testimonial__by">
          {photoUrl && <img className="ams-testimonial__avatar" src={getSizedUrl(photoUrl, 'display')} alt={block.name || ''} />}
          {block.name && <span>{block.name}</span>}
        </figcaption>
      )
      return wrap('ams-col--testimonial', null, (
        <figure className="ams-testimonial m-0">
          {photoAbove ? <>{by}{quote}</> : <>{quote}{by}</>}
        </figure>
      ))
    }

    case 'contact': {
      return wrap('ams-col--contact', null, (
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
      return wrap('ams-col--pagelinks', null, (
        <div className="ams-row" style={{ height: ROW_HEIGHT.medium }}>
          {linked.map((p) => {
            const thumb = pageDisplayThumbnail(p)
            const href = `${basePath}/${p.slug || p.id}`
            return (
              <a key={p.id} className="ams-pagelink" href={href}>
                <div className="ams-pagelink__frame">
                  {thumb && <img src={getSizedUrl(thumb, 'display')} alt={p.title || ''} loading="lazy" />}
                </div>
                <span className="ams-pagelink__title">{p.title}</span>
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
