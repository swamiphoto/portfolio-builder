// components/image-displays/print/BuyPrintButton.js
// A subtle "Buy a Print" outline button overlaid on an image (lightbox or
// thumbnail). Self-gates on the store being enabled + the image being sellable,
// and opens the shared configurator drawer via PrintStoreContext.
import React from 'react'
import { usePrintStore } from './PrintStoreContext'

export default function BuyPrintButton({ print, imageUrl, className = '', style }) {
  const ctx = usePrintStore()
  if (!ctx?.printStore?.enabled || !print?.sellable) return null

  const open = (e) => {
    e.stopPropagation()
    ctx.openConfigurator({ print, imageUrl })
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-black/30 px-3.5 py-[7px] text-[12.5px] tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-black/60 hover:border-white/80 focus:outline-none ${className}`}
      style={style}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="1" />
        <rect x="4.75" y="4.75" width="6.5" height="6.5" rx="0.5" />
      </svg>
      Buy a Print
    </button>
  )
}
