// components/image-displays/print/FramedImage.js
import React from 'react'
import { frameStyles } from '../../../common/print/framePreview'

// Paper-finish surface sheen laid over the image. Subtle by design — matte is
// flat, lustre gets a faint top sheen, metal a slightly stronger diagonal gloss.
function finishSheen(finish) {
  if (finish === 'metal') {
    return 'linear-gradient(122deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 66%, rgba(255,255,255,0.09) 100%)'
  }
  if (finish === 'lustre') {
    return 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 44%)'
  }
  return null // matte: no sheen
}

export default function FramedImage({ src, alt = '', spec, className, maxHeight = '44vh' }) {
  const s = frameStyles(spec || {})
  const sheen = finishSheen(spec?.finish)

  // The photo, recessed slightly (as if set below the mat/frame window) with the
  // finish sheen over it.
  const photo = (
    <div style={{ position: 'relative', display: 'block', lineHeight: 0 }}>
      <img src={src} alt={alt} className={className} style={{ display: 'block', maxWidth: '100%', maxHeight, objectFit: 'contain' }} />
      {sheen && <div aria-hidden style={{ position: 'absolute', inset: 0, background: sheen, pointerEvents: 'none' }} />}
      {/* Recessed inset — the image sits below the surface of the mat/frame window. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14), inset 0 2px 7px rgba(0,0,0,0.22)', pointerEvents: 'none' }} />
    </div>
  )

  if (!s.framed) {
    // Unframed print — plain, just a subtle drop shadow + the paper sheen.
    return (
      <div style={{ display: 'inline-block', boxShadow: '0 6px 18px rgba(0,0,0,0.16)' }}>
        {photo}
      </div>
    )
  }

  const pad = `${(s.bandRatio * 100).toFixed(2)}%`
  const matPad = s.matted ? `${(s.matRatio * 100).toFixed(2)}%` : 0
  return (
    <div
      data-testid="framed-image"
      style={{
        display: 'inline-block', background: s.bandColor, padding: pad,
        // Subtle drop shadow + a soft bevel so the frame reads as raised.
        boxShadow: '0 10px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.22)',
      }}
    >
      <div
        data-testid={s.matted ? 'framed-image-mat' : undefined}
        style={{
          background: s.matted ? s.matColor : s.bandColor,
          padding: matPad,
          // The mat (or the frame's rabbet when un-matted) is recessed into the frame.
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14), inset 0 2px 6px rgba(0,0,0,0.26)',
        }}
      >
        {photo}
      </div>
    </div>
  )
}
