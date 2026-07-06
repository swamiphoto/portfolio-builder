// components/image-displays/print/CheckoutStep.js
import React, { useState } from 'react'

const input = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid rgba(160,140,110,0.35)', borderRadius: 5, background: '#faf7f1', fontSize: 14, color: '#2c2416', outline: 'none', marginTop: 4 }

export default function CheckoutStep({ onBack, onSubmit, quoting, amounts, error }) {
  const [f, setF] = useState({ email: '', name: '', line1: '', city: '', region: '', postalCode: '', country: 'US' })
  const set = (k) => (e) => { const v = e.target.value; setF((prev) => ({ ...prev, [k]: v })) }
  const ready = f.email && f.line1 && f.city && f.postalCode && f.country
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(f) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#2c2416' }}
    >
      <button type="button" onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#7a6b55', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>‹ Back to options</button>
      <input style={input} placeholder="Email" aria-label="Email" value={f.email} onChange={set('email')} />
      <input style={input} placeholder="Full name" aria-label="Full name" value={f.name} onChange={set('name')} />
      <input style={input} placeholder="Address" aria-label="Address" value={f.line1} onChange={set('line1')} />
      <input style={input} placeholder="City" aria-label="City" value={f.city} onChange={set('city')} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={input} placeholder="State/Region" aria-label="Region" value={f.region} onChange={set('region')} />
        <input style={input} placeholder="Postal code" aria-label="Postal code" value={f.postalCode} onChange={set('postalCode')} />
      </div>
      <input style={input} placeholder="Country (e.g. US)" aria-label="Country" value={f.country} onChange={set('country')} />
      {amounts && (
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 13, color: '#5c4f3a', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shipping ${(amounts.shippingCost / 100).toFixed(2)}</span>
          <span>Total ${(amounts.total / 100).toFixed(2)}</span>
        </div>
      )}
      {error && <p style={{ color: '#a8563a', fontSize: 12.5, margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={!ready || quoting}
        style={{ width: '100%', padding: '13px', borderRadius: 6, border: 'none', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, background: '#2c2416', color: '#f4efe8', cursor: ready && !quoting ? 'pointer' : 'not-allowed', opacity: ready && !quoting ? 1 : 0.6 }}
      >
        {quoting ? 'Working…' : amounts ? `Pay $${(amounts.total / 100).toFixed(2)}` : 'Continue to payment'}
      </button>
    </form>
  )
}
