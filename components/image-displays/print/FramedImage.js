// components/image-displays/print/FramedImage.js
import React from 'react'
import { frameStyles } from '../../../common/print/framePreview'

export default function FramedImage({ src, alt = '', spec, className }) {
  const s = frameStyles(spec || {})
  if (!s.framed) {
    return <img src={src} alt={alt} className={className} />
  }
  const pad = `${(s.bandRatio * 100).toFixed(2)}%`
  const matPad = s.matted ? `${(s.matRatio * 100).toFixed(2)}%` : 0
  return (
    <div
      data-testid="framed-image"
      style={{ display: 'inline-block', background: s.bandColor, padding: pad, boxShadow: '0 0 0 1px rgba(255,255,255,0.16), 0 12px 34px rgba(0,0,0,0.55)' }}
    >
      <div
        data-testid={s.matted ? 'framed-image-mat' : undefined}
        style={{ background: s.matted ? s.matColor : s.bandColor, padding: matPad }}
      >
        <img src={src} alt={alt} className={className} style={{ display: 'block', maxWidth: '100%', maxHeight: '78vh' }} />
      </div>
    </div>
  )
}
