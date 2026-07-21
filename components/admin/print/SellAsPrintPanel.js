// components/admin/print/SellAsPrintPanel.js
// Print-sale control for one photo: a toggle plus a quality note. The high-res
// file that unlocks larger prints (and client downloads) lives in the File
// section of the lightbox, not here — selling just reads whether it's good enough.
import React from 'react'
import ToggleSwitch from '../common/ToggleSwitch'

const prettySize = (id) => (id ? id.replace('x', ' × ') : '')

// Standard toggle label — matches the FeatureBlock label across the admin
// (sans, 12px/medium, --text-secondary #7a6b55).
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#7a6b55' }

export default function SellAsPrintPanel({ asset, onSellChange }) {
  const print = asset?.print || {}
  const sellable = !!print.sellable

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={labelStyle}>Sell as prints</span>
        <ToggleSwitch on={sellable} onChange={onSellChange} ariaLabel="Sell as prints" />
      </div>

      {/* Quality note — sans/muted, same as every other settings description */}
      {sellable && (
        <p style={{
          margin: 0, fontSize: 11.5, lineHeight: 1.45,
          color: print.maxSharpSize ? '#a8967a' : '#a8563a',
        }}>
          {print.maxSharpSize
            ? `Prints sharply up to ${prettySize(print.maxSharpSize)} in.`
            : 'Too small to print sharply — add a larger file above.'}
        </p>
      )}
    </div>
  )
}
