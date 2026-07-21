// components/admin/common/ToggleSwitch.js
// The single sliding-pill toggle for every admin surface. It is a bare control —
// compose a label/hint around it (see FeatureBlock, ToggleRow, SellAsPrintPanel).
// Standardized size (28×14) and warm palette so every toggle looks identical;
// before this existed, the pill was hand-rolled in ~5 files and had drifted into
// two sizes and slightly different colors.
import React from 'react'

export default function ToggleSwitch({ on, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!on) }}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 28, height: 14, borderRadius: 999, padding: 0, border: 'none',
        background: on ? 'var(--sepia-accent, #8b6f47)' : 'var(--border, rgba(160,140,110,0.3))',
        boxShadow: 'inset 0 1px 1.5px rgba(60,40,15,0.10)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        className="absolute transition-transform"
        style={{
          top: 2, left: 2, width: 10, height: 10, borderRadius: 999,
          background: 'var(--card, #fdfbf7)',
          boxShadow: '0 1px 2px rgba(60,40,15,0.20)',
          transform: on ? 'translateX(14px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}
