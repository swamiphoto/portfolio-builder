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
import { resolveVariant, resolvePhotoSize, resolveFont, resolveButtonStyle, resolveSize, resolveQuoteStyle, resolveAmsterdamStyle, resolveAmsterdamFrame } from '../../../../common/themes/variants'
import { formatCaptureMeta } from '../../../../common/photoMeta'
import { captionStyleCss, resolveCaptionStyle } from '../../../../common/captionStyles'
import { FitImg, FitPlaceholder, Overlays } from '../shared/WallFit'
import VideoBlock from '../../gallery/video-block/VideoBlock'
import ContactDisplay from '../../../contact/ContactDisplay'
import MarkdownText from '../../MarkdownText'
import AmsterdamCaption from './AmsterdamCaption'

const TID = 'amsterdam'
const PHOTO_HEIGHT = { large: '68vh', medium: '56vh', small: '44vh' }
// Framed photos: the mount border + printed caption add height, so the photo
// itself sits a little shorter than a bare hang to keep the whole card on screen.
const MOUNT_PHOTO_HEIGHT = { large: '62vh', medium: '50vh', small: '38vh' }
// A framed Mosaic scatters the mounts at varied heights (scrapbook wall) instead
// of the uniform Row line-up; heights cycle per photo.
const MOUNT_SCATTER = { large: ['64vh', '50vh', '58vh', '46vh'], medium: ['52vh', '42vh', '48vh', '38vh'], small: ['40vh', '32vh', '38vh', '30vh'] }
const FRAME_CYCLE = ['card', 'mount', 'print']
const ROW_HEIGHT = { large: '84vh', medium: '62vh', small: '46vh' }
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

export default function AmsterdamColumn({ block, blockIndex, ground = 'light', onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '', showPlaceholders = false }) {
  // A photo box that renders a placeholder when the image is a placeholder marker,
  // so empty blocks preview the wall layout before any photos are added.
  const photoBox = (img, i, fitClass = 'ams-fit') => (
    img?.placeholder
      ? <FitPlaceholder fitClass={fitClass} />
      : <FitImg img={img} index={i} onImageClick={onImageClick} fitClass={fitClass} />
  )
  const PH = { placeholder: true }
  const metaFor = (o) => formatCaptureMeta(o?.capture, photoMeta, o?.uploadedAt)
  // The Caption control (Sans / Serif / Accent) overrides the caption typography;
  // 'sans' returns {} so the plaque + per-frame defaults show untouched.
  const capStyle = captionStyleCss(resolveCaptionStyle(block))
  // Every column paints one of the three De Stijl grounds (dark / light / ink),
  // assigned in rotation by AmsterdamWall. `data-surface` feeds the adaptive-chrome
  // scroll handler (useWallChrome), which floods the rail to match whatever ground
  // sits under the viewport center. Passing `ground` straight through keeps the
  // black / white / red rhythm unbroken across the whole wall.
  // data-flow rotates where matted photos sit vertically (top / middle / low) so
  // the dividerless wall reads as a free-flowing collage, not a centered grid.
  const wrap = (cls, style, children, surface = ground, extra = {}) => (
    <section className={`ams-col ${cls}`} data-block-index={blockIndex} data-surface={surface} data-flow={blockIndex % 3} style={style} {...extra} {...hoverProps}>{children}</section>
  )

  // A vintage mount around a photo — cabinet card, archival board, or bordered
  // print — with the caption printed on the card itself (bottom). 'mixed' rotates
  // the three styles across a set for a scrapbook feel.
  const mount = (img, i, frame, height) => {
    const style = frame === 'mixed' ? FRAME_CYCLE[i % FRAME_CYCLE.length] : frame
    const cap = img?.placeholder ? '' : (img.caption || '')
    const m = img?.placeholder ? '' : metaFor(img)
    // A long caption hangs beside the photo's long (right) edge instead of widening
    // the frame; it's clamped and clicking it opens the full caption in the lightbox.
    const beside = cap.length > 70
    const openLightbox = beside && onImageClick ? () => onImageClick(i) : undefined
    return (
      <figure key={i} className={`ams-mount ams-mount--${style}`} data-flip={i % 3} data-caplayout={beside ? 'beside' : 'below'}>
        <div className="ams-mount__photo" style={{ height }}>
          {photoBox(img, i)}
        </div>
        {(cap || m) && (
          <figcaption className="ams-mount__label" onClick={openLightbox} {...(openLightbox ? { role: 'button', tabIndex: 0, title: cap } : {})}>
            {cap && <span className="ams-mount__title" style={capStyle}>{cap}</span>}
            {m && <span className="ams-mount__meta">{m}</span>}
          </figcaption>
        )}
      </figure>
    )
  }

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
      const isFill = resolveVariant(block, TID) !== 'centered'
      const frame = resolveAmsterdamFrame(block)
      // Framed: the photo sits in a vintage mount with its caption on the card.
      // Frames only apply to a Centered photo — a Fill photo is edge-to-edge, so a
      // mount makes no sense there (the Frame control is hidden for Fill too).
      if (frame !== 'none' && !isFill) {
        const size = resolvePhotoSize(block, TID)
        return wrap('ams-col--photo ams-col--framed', null,
          mount(imgObj, 0, frame, MOUNT_PHOTO_HEIGHT[size] || MOUNT_PHOTO_HEIGHT.large))
      }
      // Only UNcaptioned Fill photos go edge-to-edge full-bleed. A caption always
      // means a museum hang: the photo mats on the ground and its plaque hangs to
      // the RIGHT (title + attributes), wrapping in columns so it never overflows.
      if (isFill && !caption && !meta) {
        return wrap('ams-col--photo ams-col--fill', null, (
          <figure className="ams-figure ams-figure--fill">
            <div className="ams-frame" style={{ height: '100vh' }}>
              {photoBox(imgObj, 0)}
            </div>
          </figure>
        ))
      }
      const size = resolvePhotoSize(block, TID)
      // Fill keeps a tall frame (near the container height, with margin); Centered
      // is sized by the Size control. Either way the plaque hangs on the right.
      const frameH = isFill ? '82vh' : (PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large)
      return wrap('ams-col--photo', null, (
        <figure className="ams-figure ams-figure--plaque">
          <div className="ams-frame" style={{ flex: '0 0 auto', height: frameH }}>
            {photoBox(imgObj, 0)}
          </div>
          <AmsterdamCaption caption={caption} meta={meta} beside tag="Left" titleStyle={capStyle} />
        </figure>
      ))
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
      const isMosaicVariant = resolveVariant(block, TID) === 'mosaic'

      // Frames apply to either layout: a Row of mounts, or (when Mosaic is chosen)
      // a scrapbook scatter of mounts at varied heights.
      const frame = resolveAmsterdamFrame(block)
      if (frame !== 'none') {
        const heights = MOUNT_SCATTER[size] || MOUNT_SCATTER.large
        const mh = MOUNT_PHOTO_HEIGHT[size] || MOUNT_PHOTO_HEIGHT.large
        return wrap(`ams-col--photorow ams-col--framed${isMosaicVariant ? ' ams-col--framed-scatter' : ''}`, null, (
          <div className={`ams-row ams-row--framed${isMosaicVariant ? ' ams-row--scatter' : ''}`}>
            {refs.map((img, i) => mount(img, i, frame, isMosaicVariant ? heights[i % heights.length] : mh))}
          </div>
        ))
      }

      if (isMosaicVariant) {
        const mH = MOSAIC_HEIGHT[size] || MOSAIC_HEIGHT.large
        return wrap('ams-col--mosaic', null, (
          <div className="ams-mosaic" style={{ height: mH }}>
            {mosaicGroups(refs).map((grp, gi) => {
              if (grp.length === 1) {
                return (
                  <div key={gi} className="ams-mosaic__group ams-mosaic__group--solo">
                    <div className="ams-frame" style={{ height: mH }}>
                      {photoBox(grp[0], refs.indexOf(grp[0]))}
                      {grp[0].caption && <figcaption className="ams-mosaic__cap"><span style={capStyle}>{grp[0].caption}</span></figcaption>}
                    </div>
                  </div>
                )
              }
              return (
                <div key={gi} className="ams-mosaic__group" style={{ width: MOSAIC_GROUP_WIDTHS[gi % MOSAIC_GROUP_WIDTHS.length] }}>
                  {grp.map((img, ci) => {
                    if (img?.placeholder) {
                      return (
                        <div key={ci} className="ams-mosaic__cell">
                          <FitPlaceholder fitClass="ams-fit" />
                        </div>
                      )
                    }
                    const url = getImageRefUrl(img) || img.url || img
                    return (
                      <div key={ci} className="ams-mosaic__cell relative group">
                        <img src={getSizedUrl(url, 'display')} alt={img.caption || 'Photo'} loading="lazy" onClick={() => onImageClick?.(refs.indexOf(img))} />
                        <Overlays url={url} print={img.print} />
                        {img.caption && <figcaption className="ams-mosaic__cap"><span style={capStyle}>{img.caption}</span></figcaption>}
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
      // Captions sit beneath each photo in a row, so no LEFT/RIGHT side tag.
      return wrap('ams-col--photorow', null, (
        <div className="ams-row">
          {refs.map((img, i) => (
            <figure key={i} className="ams-row__item m-0">
              <div className="ams-frame" style={{ height: rowH }}>
                {photoBox(img, i)}
              </div>
              {!img?.placeholder && <AmsterdamCaption caption={img.caption || ''} meta={metaFor(img)} titleStyle={capStyle} />}
            </figure>
          ))}
        </div>
      ))
    }

    case 'text': {
      if (!block.content && !showPlaceholders) return null
      const fontFamily = resolveFont(block, TID)
      const variant = resolveVariant(block, TID)
      // Empty text block: skeleton lines (like the other themes) rather than prose.
      if (!block.content) {
        return wrap('ams-col--quiet', null, (
          <div className="wall-text-placeholder" aria-hidden>
            <span style={{ width: '82%' }} /><span style={{ width: '94%' }} /><span style={{ width: '58%' }} />
          </div>
        ))
      }
      // Markdown blocks carry their own structure (headings, lists, images), so
      // the drop-cap and column tricks below stay plain-text-only. Amsterdam has
      // no distinct heading/quote treatment beyond Panel vs Quiet — formatting
      // (bold, links, lists) is what matters here, not new art direction.
      if (block.format === 'markdown') {
        if (resolveAmsterdamStyle(block) === 'quiet') {
          const mdStyle = { fontFamily, fontSize: QUIET_SIZE[variant] || QUIET_SIZE.body }
          return wrap('ams-col--quiet', null, (
            <div className="ams-quiet__text" style={mdStyle}><MarkdownText content={block.content} variantClasses={{ heading: '', body: '', quote: '' }} /></div>
          ))
        }
        const mdStyle = { fontFamily, fontSize: PANEL_SIZE[variant] || PANEL_SIZE.body }
        return wrap('ams-col--panel', null, (
          <div className="ams-panel__text" style={mdStyle}><MarkdownText content={block.content} variantClasses={{ heading: '', body: '', quote: '' }} /></div>
        ))
      }
      // Split a leading capital off so it can be set as an oversized drop cap;
      // the rest flows beside/under it. Long copy sets in two columns.
      const content = String(block.content)
      const m = content.match(/^(\s*)(\S)([\s\S]*)$/)
      const [lead, cap, rest] = m ? [m[1], m[2], m[3]] : ['', '', content]
      const dropCap = cap
        ? <><span className="ams-dropcap" aria-hidden>{cap}</span>{lead}{rest}</>
        : content
      // Two columns are a magazine setting for small body copy — a big heading/
      // subheading statement stays a single column so the Size control reads true.
      if (resolveAmsterdamStyle(block) === 'quiet') {
        const twoCol = content.length > 240 && variant === 'body'
        return wrap('ams-col--quiet', null, (
          <p className={`ams-quiet__text${twoCol ? ' ams-text--twocol' : ''}`} style={{ fontFamily, fontSize: QUIET_SIZE[variant] || QUIET_SIZE.body }}>{dropCap}</p>
        ))
      }
      // Panel is one fixed size; long copy flows into height-constrained columns so
      // it respects the margins instead of overflowing the top of the viewport.
      const long = content.length > 300
      return wrap('ams-col--panel', null, (
        <p className={`ams-panel__text${long ? ' ams-panel__text--cols' : ''}`} style={{ fontFamily }}>{dropCap}</p>
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
