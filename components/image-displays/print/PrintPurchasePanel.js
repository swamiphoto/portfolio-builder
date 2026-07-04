// components/image-displays/print/PrintPurchasePanel.js
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { optionPrice } from '../../../common/print/buyerPricing'

const pretty = (id) => id.replace('x', ' × ')

function Chip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active ? 'bg-white text-black border-white' : 'text-white/80 border-white/25 hover:border-white/60'
      }`}
    >
      {label}
    </button>
  )
}

export default function PrintPurchasePanel({ print, printStore, spec, onSpecChange, onClose }) {
  const markup = printStore?.markup || 3
  const set = (patch) => onSpecChange({ ...spec, ...patch })
  const sizes = (print?.availableSizes || [])
  const frame = SEED_CATALOG.frames.find((f) => f.id === spec.frame) || SEED_CATALOG.frames[0]
  const framed = spec.frame !== 'none'
  const price = optionPrice(SEED_CATALOG, { size: spec.size, finish: spec.finish, frame: spec.frame, matte: spec.matte }, markup)

  return (
    <div className="text-white/90 w-full max-w-sm space-y-5">
      {onClose && (
        <button
          type="button"
          aria-label="Close print options"
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-white/60 hover:text-white/90 transition-colors -mt-1"
        >
          ‹ Back to photo
        </button>
      )}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Size</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <Chip key={s} active={spec.size === s} label={`${pretty(s)} in`} onClick={() => set({ size: s })} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Finish</p>
        <div className="flex flex-wrap gap-2">
          {SEED_CATALOG.finishes.map((f) => (
            <Chip key={f.id} active={spec.finish === f.id} label={f.label} onClick={() => set({ finish: f.id })} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Framing</p>
        <div className="flex flex-wrap gap-2">
          {SEED_CATALOG.frames.map((f) => (
            <Chip
              key={f.id}
              active={spec.frame === f.id}
              label={f.label}
              onClick={() => set({ frame: f.id, frameColor: f.colors[0] || null, matte: f.id === 'none' ? false : spec.matte })}
            />
          ))}
        </div>
      </div>

      {framed && (
        <>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40">Frame color</p>
            <div className="flex flex-wrap gap-2">
              {frame.colors.map((c) => (
                <Chip key={c} active={spec.frameColor === c} label={c} onClick={() => set({ frameColor: c })} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={!!spec.matte} onChange={(e) => set({ matte: e.target.checked })} />
            With mat
          </label>
        </>
      )}

      <div className="pt-2 border-t border-white/15 space-y-2">
        <button
          type="button"
          disabled
          className="w-full py-3 rounded-md bg-white/90 text-black font-medium opacity-70 cursor-not-allowed"
        >
          Buy this print — ${price}
        </button>
        <p className="text-center text-xs text-white/40">Checkout coming soon</p>
      </div>
    </div>
  )
}
