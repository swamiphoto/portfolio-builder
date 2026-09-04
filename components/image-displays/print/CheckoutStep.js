// components/image-displays/print/CheckoutStep.js
import React, { useState } from 'react'

const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif'
const input = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid rgba(160,140,110,0.35)', borderRadius: 5, background: '#faf7f1', fontFamily: SANS, fontSize: 14, color: '#2c2416', outline: 'none', marginTop: 4 }

// Common Prodigi shipping destinations (worldwide list kept lean but broad).
const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['IN', 'India'],
  ['IE', 'Ireland'], ['NZ', 'New Zealand'], ['DE', 'Germany'], ['FR', 'France'], ['IT', 'Italy'],
  ['ES', 'Spain'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'],
  ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PT', 'Portugal'],
  ['PL', 'Poland'], ['CZ', 'Czechia'], ['GR', 'Greece'], ['JP', 'Japan'], ['SG', 'Singapore'],
  ['HK', 'Hong Kong'], ['KR', 'South Korea'], ['MY', 'Malaysia'], ['TH', 'Thailand'], ['AE', 'United Arab Emirates'],
  ['IL', 'Israel'], ['ZA', 'South Africa'], ['MX', 'Mexico'], ['BR', 'Brazil'],
]

// Light client-side postal validation — catches the common country/format mismatch
// before the lab rejects it. Prodigi still validates authoritatively server-side.
function postalError(country, postal) {
  const v = (postal || '').trim()
  if (!v) return null
  if (country === 'US' && !/^\d{5}(-\d{4})?$/.test(v)) return 'US ZIP should be 5 digits (e.g. 94588).'
  if (country === 'CA' && !/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(v)) return 'Enter a valid Canadian postal code (e.g. K1A 0B1).'
  return null
}

export default function CheckoutStep({ onBack, onSubmit, quoting, amounts, error }) {
  const [f, setF] = useState({ email: '', name: '', line1: '', city: '', region: '', postalCode: '', country: 'US' })
  const set = (k) => (e) => { const v = e.target.value; setF((prev) => ({ ...prev, [k]: v })) }
  const zipErr = postalError(f.country, f.postalCode)
  const ready = f.email && f.line1 && f.city && f.postalCode && f.country && !zipErr
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(f) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#2c2416', paddingBottom: 24 }}
    >
      <button type="button" onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#7a6b55', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>‹ Back to options</button>
      <input style={input} placeholder="Email" aria-label="Email" value={f.email} onChange={set('email')} />
      <input style={input} placeholder="Full name" aria-label="Full name" value={f.name} onChange={set('name')} />
      <input style={input} placeholder="Address" aria-label="Address" value={f.line1} onChange={set('line1')} />
      <input style={input} placeholder="City" aria-label="City" value={f.city} onChange={set('city')} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={input} placeholder="State/Region" aria-label="Region" value={f.region} onChange={set('region')} />
        <input style={{ ...input, borderColor: zipErr ? 'rgba(168,86,58,0.6)' : input.border }} placeholder="Postal code" aria-label="Postal code" value={f.postalCode} onChange={set('postalCode')} />
      </div>
      {zipErr && <p style={{ color: '#a8563a', fontSize: 11.5, margin: '-2px 0 0' }}>{zipErr}</p>}
      <select
        style={{ ...input, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8967a' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', backgroundSize: '12px', paddingRight: 30 }}
        aria-label="Country"
        value={f.country}
        onChange={set('country')}
      >
        {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
      {amounts && (
        <div style={{ fontFamily: SANS, fontSize: 13, color: '#5c4f3a', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shipping ${(amounts.shippingCost / 100).toFixed(2)}</span>
          <span>Total ${(amounts.total / 100).toFixed(2)}</span>
        </div>
      )}
      {error && <p style={{ color: '#a8563a', fontSize: 12.5, margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={!ready || quoting}
        style={{ width: '100%', padding: '13px 16px', borderRadius: 6, border: 'none', fontFamily: SANS, fontSize: 14, fontWeight: 500, letterSpacing: '0.01em', background: '#2c2416', color: '#f4efe8', cursor: ready && !quoting ? 'pointer' : 'not-allowed', opacity: ready && !quoting ? 1 : 0.6, transition: 'background 0.15s' }}
        onMouseEnter={(e) => { if (ready && !quoting) e.currentTarget.style.background = '#3a2f22' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#2c2416' }}
      >
        {quoting ? 'Working…' : amounts ? `Pay $${(amounts.total / 100).toFixed(2)}` : 'Continue to payment'}
      </button>
    </form>
  )
}
