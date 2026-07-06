// components/image-displays/print/BuyPrintButton.js
// A restrained "Buy a print" label-button overlaid on an image (lightbox or
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
      className={className}
      style={{
        fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif',
        fontSize: 11.5,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        fontWeight: 500,
        color: '#2c2416',
        background: 'rgba(249,245,238,0.9)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        padding: '8px 16px',
        borderRadius: 999,
        border: 'none',
        boxShadow: '0 1px 5px rgba(20,14,8,0.16)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(252,249,244,1)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,14,8,0.2)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(249,245,238,0.9)'
        e.currentTarget.style.boxShadow = '0 1px 5px rgba(20,14,8,0.16)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      Buy a print
    </button>
  )
}
