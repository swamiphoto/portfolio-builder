// components/image-displays/themes/amsterdam/AmsterdamColumn.js
// Renders one gallery block as a column in the Amsterdam poster wall. Nothing
// scrolls vertically — every block fits the viewport height and extends the
// wall's left→right scroll.
//   photo        → Fill (edge-to-edge height, default) or Centered (Size + plaque).
//   photos       → Row (side by side, captions beneath) or Mosaic (groups of 1/2/3).
//   text         → a quiet cream museum label; L/M/S from the variant. Long copy
//                  auto-flows into balanced columns when it would overrun the height.
//   video/testimonial/contact/page-gallery → their own columns.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail } from '../../../../common/assetRefs'
import { resolveVariant, resolvePhotoSize, resolveFont, resolveButtonStyle, resolveSize, resolveQuoteStyle, resolveAmsterdamFrame } from '../../../../common/themes/variants'
import { formatCaptureMeta } from '../../../../common/photoMeta'
import { captionStyleCss, resolveCaptionStyle } from '../../../../common/captionStyles'
import { FitImg, FitPlaceholder, Overlays } from '../shared/WallFit'
import { useBalancedColumns } from '../shared/useBalancedColumns'
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
// One restrained text scale (museum-label register): Medium is the readable base,
// Large/Small step one notch either way. No poster-sized display type any more.
// Fixed reading scale (CSS vars on .ams-stage; steps down on mobile). L/M/S →
// heading/subheading/body; Medium is the default. Testimonials share the same scale.
const TEXT_SIZE = { heading: 'var(--fs-text-l)', subheading: 'var(--fs-text-m)', body: 'var(--fs-text-s)' }
const QUOTE_SIZE = { large: 'var(--fs-text-l)', medium: 'var(--fs-text-m)', small: 'var(--fs-text-s)' }
// One column of quiet copy, plus the gap when it flows into several.
const TEXT_COL_W = 'clamp(280px, 26vw, 440px)'
const TEXT_GAP = 'clamp(1.6rem, 2.4vw, 2.8rem)'

// The quiet museum label. Short copy sets in one centered column (with a fancy drop
// cap); copy long enough to overrun the column height auto-flows into N balanced
// columns so it stays within the top/bottom margins and reads evenly.
function AmsterdamText({ block, fontFamily, fontSize }) {
  const content = String(block.content)
  const isMd = block.format === 'markdown'
  const { ref, cols, columnStyle } = useBalancedColumns([content, fontFamily, fontSize], { colWidth: TEXT_COL_W, gap: TEXT_GAP })
  const multi = cols > 1
  const cls = `ams-quiet__text${multi ? ' ams-text--cols' : ''}`
  const style = { fontFamily, fontSize, ...(columnStyle || {}) }
  if (isMd) {
    return (
      <div ref={ref} className={cls} style={style}>
        <MarkdownText content={content} variantClasses={{ heading: '', body: '', quote: '' }} />
      </div>
    )
  }
  // Split a leading capital off as an oversized drop cap; the rest flows around it.
  // A multi-column magazine setting drops the cap — it only reads in a single column.
  // A drop cap only earns its place when there's enough copy to wrap around it (a
  // two/three-line paragraph); on a short one-liner it looks stranded, so skip it.
  const m = content.match(/^(\s*)(\S)([\s\S]*)$/)
  const [lead, cap, rest] = m ? [m[1], m[2], m[3]] : ['', '', content]
  const enoughForCap = content.trim().length >= 90
  const body = (!multi && cap && enoughForCap)
    ? <><span className="ams-dropcap" aria-hidden>{cap}</span>{lead}{rest}</>
    : content
  return <p ref={ref} className={cls} style={style}>{body}</p>
}

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

export default function AmsterdamColumn({ block, blockIndex, ground = 'light', onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '', username, showPlaceholders = false }) {
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
  const wrap = (cls, style, children, surface = ground, extra = {}) => {
    // Merge the editor's hoverProps style (cursor:pointer) into the column's own
    // layout style rather than replacing it (mirrors Florence). Amsterdam columns
    // currently pass no layout style, but this keeps a future styled column from
    // silently losing it in the editor preview.
    const { style: hoverStyle, ...restHover } = hoverProps
    return (
      <section className={`ams-col ${cls}`} data-block-index={blockIndex} data-surface={surface} data-flow={blockIndex % 3} style={{ ...style, ...hoverStyle }} {...extra} {...restHover}>{children}</section>
    )
  }

  // A vintage mount around a photo — cabinet card, archival board, or bordered
  // print — with the caption printed on the card itself (bottom). 'mixed' rotates
  // the three styles across a set for a scrapbook feel.
  // On the light frame cards the muted mono caption color reads dull, so drop the
  // caption-style color there and let the frame's own dark caption color show; keep
  // an explicit Accent (red) color though.
  const { color: capColor, ...capNoColor } = capStyle
  const mountCapStyle = (capColor && capColor !== 'rgb(220, 38, 38)') ? capNoColor : capStyle
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
            {cap && <span className="ams-mount__title" style={mountCapStyle}>{cap}</span>}
            {m && <span className="ams-mount__meta">{m}</span>}
          </figcaption>
        )}
      </figure>
    )
  }

  // A caption printed INSIDE the photo: a bottom-left overlay with a soft scrim
  // (mirrors Florence's fill label) so it never hangs on the colored ground.
  const insetLabel = (cap, m) => (cap || m) ? (
    <figcaption className="ams-fill-label">
      {cap && <span className="ams-caption__title" style={capStyle}>{cap}</span>}
      {m && <span className="ams-caption__meta">{m}</span>}
    </figcaption>
  ) : null

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
      // Fill: the photo spans the whole column height, edge to edge. Any caption is
      // printed INSIDE the image (a bottom overlay), never hung on the colored ground.
      if (isFill) {
        return wrap('ams-col--photo ams-col--fill', null, (
          <figure className="ams-figure ams-figure--fill">
            <div className="ams-frame" style={{ height: '100vh' }}>
              {photoBox(imgObj, 0)}
              {insetLabel(caption, meta)}
            </div>
          </figure>
        ))
      }
      // Centered: sized by the Size control. A short caption overlays inside the
      // image (like Fill); a long one (3+ lines) hangs BESIDE the photo on the right
      // instead of burying the frame — even with no frame chosen, mirroring the mount.
      const size = resolvePhotoSize(block, TID)
      const besideCaption = caption.length > 120
      const frameEl = (
        <div className="ams-frame" style={{ flex: '0 0 auto', height: PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large }}>
          {photoBox(imgObj, 0)}
          {!besideCaption && insetLabel(caption, meta)}
        </div>
      )
      if (besideCaption) {
        const openLightbox = onImageClick ? () => onImageClick(0) : undefined
        return wrap('ams-col--photo', null, (
          <figure className="ams-figure ams-figure--plaque">
            {frameEl}
            <figcaption className="ams-caption ams-caption--beside" onClick={openLightbox} {...(openLightbox ? { role: 'button', tabIndex: 0, title: caption } : {})}>
              {caption && <span className="ams-caption__title" style={capStyle}>{caption}</span>}
              {meta && <span className="ams-caption__meta">{meta}</span>}
            </figcaption>
          </figure>
        ))
      }
      return wrap('ams-col--photo', null, (
        <figure className="ams-figure">{frameEl}</figure>
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
                {!img?.placeholder && insetLabel(img.caption || '', metaFor(img))}
              </div>
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
      const fontSize = TEXT_SIZE[variant] || TEXT_SIZE.body
      return wrap('ams-col--quiet', null, (
        <AmsterdamText block={block} fontFamily={fontFamily} fontSize={fontSize} />
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
      const fontSize = QUOTE_SIZE[resolveSize(block, TID)] || QUOTE_SIZE.medium
      const photoAbove = resolveVariant(block, TID) === 'photo-above'
      const quote = block.text && (
        <blockquote className="ams-testimonial__quote" style={{ fontFamily, fontStyle: italic ? 'italic' : 'normal', fontSize }}>{block.text}</blockquote>
      )
      const by = (photoUrl || block.name) && (
        <figcaption className="ams-testimonial__by">
          {photoUrl && <img className="ams-testimonial__avatar" src={getSizedUrl(photoUrl, 'display')} alt={block.name || ''} />}
          {block.name && <span className="ams-testimonial__name">{block.name}</span>}
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
          username={username}
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
