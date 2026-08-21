// components/image-displays/themes/tofino/TofinoOffsetGallery.js
// Tofino's signature photos layout: images pair into alternating asymmetric
// rows — one wide, one narrow, the narrow one dropped down the page — with the
// keyline frame (theme CSS) and a small mono caption beneath each. A trailing
// unpaired image centers at the wide width. Desktop-only: the mobile render
// collapses to the shared single-column masonry (see Gallery.js).
import React from 'react'
import { getSizedUrl } from '../../../../common/imageUtils'
import { captionStyleCss } from '../../../../common/captionStyles'
import BuyPrintButton from '../../print/BuyPrintButton'
import EngagementActions from '../../engagement/EngagementActions'
import WatermarkOverlay from '../../engagement/WatermarkOverlay'

// [wide, narrow] column widths as a % of the content row, per Size (L/M/S).
const SCALE = { large: [58, 30], medium: [50, 26], small: [42, 22] }

export default function TofinoOffsetGallery({ images = [], onImageClick, captionStyle = 'mono', size = 'large' }) {
  const capCss = captionStyleCss(captionStyle)
  const [wide, narrow] = SCALE[size] || SCALE.large

  const cell = (img, index, widthPct, offsetPct) => (
    <div key={index} className="flex flex-col" style={{ width: `${widthPct}%`, marginTop: offsetPct ? `${offsetPct}%` : undefined }}>
      <div className="relative group">
        <div className="photo-cta-scrim" aria-hidden="true" />
        <img
          src={getSizedUrl(img.url, 'display')}
          alt={img.caption || ''}
          className="w-full h-auto cursor-pointer"
          onClick={() => onImageClick && onImageClick(index)}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <WatermarkOverlay />
        <div className="photo-cta-overlay absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <BuyPrintButton print={img.print} imageUrl={img.url} />
        </div>
        <div className="photo-cta-overlay absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
          <EngagementActions imageUrl={img.url} />
        </div>
      </div>
      {img.caption && <p className="mt-3 text-left" style={capCss}>{img.caption}</p>}
    </div>
  )

  const rows = []
  for (let i = 0; i < images.length; i += 2) rows.push(images.slice(i, i + 2))

  return (
    <div className="tofino-offset w-full max-w-6xl mx-auto px-6 md:px-10">
      {rows.map((row, r) => {
        const base = r * 2
        if (row.length === 1) {
          return (
            <div key={r} className="tofino-offset-row flex justify-center">
              {cell(row[0], base, wide, 0)}
            </div>
          )
        }
        // Even rows hang the wide image left; odd rows mirror it. The narrow
        // image (or the trailing wide one) drops down for the staggered rhythm.
        const flip = r % 2 === 1
        return (
          <div key={r} className="tofino-offset-row flex justify-between items-start">
            {flip ? (
              <>
                {cell(row[0], base, narrow, 0)}
                {cell(row[1], base + 1, wide, 10)}
              </>
            ) : (
              <>
                {cell(row[0], base, wide, 0)}
                {cell(row[1], base + 1, narrow, 16)}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
