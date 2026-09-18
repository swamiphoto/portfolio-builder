import { useState, useRef, useEffect } from 'react'
import PopoverShell from './PopoverShell'
import DomainPanel from './DomainPanel'
import DesignControlsBody from './DesignControlsBody'
import { DesignSection, PillToggle as DesignPillToggle } from './designControls'
import { normalizeCustomDomain, subdomainHost } from '../../../common/domainUtils'
import { THEME_LIST, getTheme } from '../../../common/themes'
import { EditableInput } from './EditableText'
import ToggleSwitch from '../common/ToggleSwitch'
import MarkdownEditorPanel from '../gallery-builder/MarkdownEditorPanel'
import { getSizedUrl } from '../../../common/imageUtils'

export const themeOptions = () => THEME_LIST.filter(t => !t.hidden).map(t => ({ value: t.id, label: t.name }))

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

// Cover title/description font choices — mirrors the text block font slots
// (which map to theme.tokens.fonts), plus Sans. See fontFamilyForSlot.
// Display was dropped — on most themes it read the same as Editorial, so the two
// choices made no visible difference. Serif / Editorial / Sans are distinct.
const COVER_FONT_OPTIONS = [
  { id: 'serif', label: 'Serif' },
  { id: 'fraunces', label: 'Editorial' },
  { id: 'sans', label: 'Sans' },
]

// ── Shared tokens ────────────────────────────────────────────────────────────
const DIVIDER_STRONG = '1px solid rgba(160,140,110,0.20)'
const DIVIDER_SOFT   = '1px solid rgba(160,140,110,0.12)'
const INPUT_BORDER   = 'rgba(160,140,110,0.32)'
const INPUT_FOCUS    = 'rgba(92,79,58,0.65)'

const inputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${INPUT_BORDER}`,
  padding: '0 0 7px',
  fontSize: 13,
  lineHeight: 1.35,
  color: '#2c2416',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const inputCls = 'site-input'

// Uppercase mono group label (matches the Field label treatment).
const sectionLabel = {
  fontSize: 10,
  color: 'var(--text-muted)',
  fontFamily: MONO,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
}

// Prominent group header — darker + bolder than a field label so the two read
// as distinct levels of hierarchy.
const sectionHeader = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#8b6f47',
  fontFamily: MONO,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
}

// Collapsible section header for the Print store panel — the only settings view
// with multiple sections. Chevron points down when collapsed, flips up when open.
// Muted-gray to match the drill-in chevrons on the main settings screen.
function AccordionHeader({ label, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <span style={sectionHeader}>{label}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2}
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
      </svg>
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: MONO,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

function AssetField({ label, value, onChange, fallbackUrl, onPickFromLibrary, contain, small }) {
  const displayUrl = value || fallbackUrl || null
  const imgFit = contain ? 'object-contain p-1' : 'object-cover'
  const dim = contain ? { width: 88, height: 44 } : small ? { width: 44, height: 44 } : { width: 60, height: 60 }

  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: MONO,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div
          role={onPickFromLibrary ? 'button' : undefined}
          tabIndex={onPickFromLibrary ? 0 : undefined}
          aria-label={onPickFromLibrary ? (value ? 'Change image' : 'Select image') : undefined}
          onClick={onPickFromLibrary || undefined}
          onKeyDown={onPickFromLibrary ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickFromLibrary() } } : undefined}
          className="flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{
            ...dim,
            background: 'rgba(255,253,248,0.6)',
            border: '1px solid rgba(160,140,110,0.22)',
            borderRadius: 4,
            cursor: onPickFromLibrary ? 'pointer' : 'default',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={onPickFromLibrary ? (e) => { e.currentTarget.style.borderColor = 'rgba(139,111,71,0.5)' } : undefined}
          onMouseLeave={onPickFromLibrary ? (e) => { e.currentTarget.style.borderColor = 'rgba(160,140,110,0.22)' } : undefined}
        >
          {displayUrl ? (
            <img src={displayUrl} className={`w-full h-full ${imgFit}`} alt="" />
          ) : (
            <span style={{ color: 'rgba(168,150,122,0.55)', fontSize: 18, fontWeight: 300 }}>+</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {onPickFromLibrary && (
            <button
              type="button"
              onClick={onPickFromLibrary}
              style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'left', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
              onMouseLeave={e => e.currentTarget.style.color = '#7a6b55'}
            >
              {value ? 'Change…' : 'Select image'}
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'left', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3L11 8l-5 5" />
    </svg>
  )
}

function DrillRow({ label, hint, status, onDrillIn }) {
  return (
    <button
      type="button"
      onClick={onDrillIn}
      className="w-full flex items-center text-left transition-colors group"
      style={{
        padding: '11px 14px',
        borderBottom: DIVIDER_SOFT,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,140,110,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: '#2c2416' }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: MONO, letterSpacing: '0.06em' }}>{hint}</div>}
      </div>
      {status && <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{status}</span>}
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}><ChevronRight /></span>
    </button>
  )
}


export const BrushIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
)

function HeaderIconButton({ children, onClick, title, innerRef }) {
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.12)'; e.currentTarget.style.color = '#2c2416' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}

// Render a plain string with any http(s) URLs turned into links, so a Stripe
// error that points the owner at their dashboard is actually clickable.
function withLinks(text) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>
      : part
  )
}

function PrintView({ anchorEl, onClose, ps, updatePrintStore, onBack }) {
  // null = loading; otherwise { connected, chargesEnabled, detailsSubmitted }
  const [payoutStatus, setPayoutStatus] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const [showPayoutHelp, setShowPayoutHelp] = useState(false)
  const [earnings, setEarnings] = useState(null) // { total (cents), count, currency }
  const [openingDashboard, setOpeningDashboard] = useState(false)

  useEffect(() => {
    fetch('/api/admin/print/connect/status')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setPayoutStatus({
        connected: !!data.connected,
        chargesEnabled: !!data.chargesEnabled,
        detailsSubmitted: !!data.detailsSubmitted,
      }))
      .catch(() => setPayoutStatus({ connected: false, chargesEnabled: false, detailsSubmitted: false }))
    fetch('/api/admin/print/earnings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEarnings(d) })
      .catch(() => {})
  }, [])

  const money = (cents, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((cents || 0) / 100)

  async function openDashboard() {
    setOpeningDashboard(true)
    try {
      const res = await fetch('/api/admin/print/connect/login-link', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningDashboard(false)
    }
  }

  // Four states: still loading, active (charges live), pending (form submitted
  // but Stripe still verifying), and not-yet-connected.
  const payoutsActive = payoutStatus?.chargesEnabled
  const payoutsPending = payoutStatus && payoutStatus.connected && !payoutStatus.chargesEnabled

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch('/api/admin/print/connect', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location = data.url
        return
      }
      setConnectError(data.error || 'Could not start Stripe onboarding. Please try again.')
      setConnecting(false)
    } catch (_) {
      setConnectError('Network error. Check your connection and try again.')
      setConnecting(false)
    }
  }

  // Accordion: one section open at a time. Products open by default.
  const [openSection, setOpenSection] = useState('products')
  const toggleSection = (name) => setOpenSection((s) => (s === name ? null : name))

  const markup = ps.markup ?? 3
  const feePct = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT || 0)
  const exampleCost = 20
  const bufferDollars = (ps.shippingBuffer || 0) / 100
  const exampleRetailBase = Math.round(exampleCost * markup)
  // With free shipping on, the buffer is folded into the sticker price rather
  // than billed separately, so the walkthrough number should reflect that.
  const exampleRetail = ps.freeShipping ? exampleRetailBase + bufferDollars : exampleRetailBase
  const exampleCommission = Math.round(exampleRetail * feePct / 100)
  const exampleProfit = exampleRetail - exampleCost - exampleCommission

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Print store" onBack={onBack}>
      <div style={{ padding: '12px 14px 14px' }} className="space-y-3">
        {/* Intro */}
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Choose what to sell. Turn a product on, mark photos for sale, and connect payouts to make the Buy button go live.
        </p>

        {/* Products — one toggle per product type (only Prints for now). */}
        <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 11 }}>
          <AccordionHeader label="Products" open={openSection === 'products'} onClick={() => toggleSection('products')} />
          {openSection === 'products' && (
          <div className="space-y-2.5" style={{ marginTop: 13 }}>
            <div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: '#2c2416' }}>Prints</span>
                <ToggleSwitch ariaLabel="Prints" on={!!ps.enabled} onChange={() => updatePrintStore({ enabled: !ps.enabled })} />
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4, marginBottom: 0 }}>
                Framed and unframed. Shows a Buy button on photos you mark for sale.
              </p>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
              More product types coming soon.
            </p>
          </div>
          )}
        </div>

        {/* Pricing */}
        <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 11 }}>
          <AccordionHeader label="Pricing" open={openSection === 'pricing'} onClick={() => toggleSection('pricing')} />
          {openSection === 'pricing' && (
          <div className="space-y-4" style={{ marginTop: 13 }}>
            <Field label="Your markup (× lab cost)">
              <input
                className={inputCls}
                style={inputStyle}
                type="number"
                min="1"
                step="0.1"
                placeholder="3"
                value={markup}
                onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n) && n > 0) updatePrintStore({ markup: n }) }}
              />
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
                You charge {markup}× our lab cost{ps.freeShipping ? `, plus a $${bufferDollars} shipping buffer` : ''}. A print that costs $20 to make sells for{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>${exampleRetail}</strong>{ps.freeShipping ? ' with free shipping' : ''}, you keep{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>${exampleProfit}</strong>
                {feePct > 0 ? ` after Sepia’s ${feePct}% commission` : ''}.
              </p>
            </Field>

            <Field label="Currency">
              <select
                className={inputCls}
                style={inputStyle}
                value={ps.currency || 'USD'}
                onChange={(e) => updatePrintStore({ currency: e.target.value })}
              >
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
                Used for prints and package sales.
              </p>
            </Field>

            <div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: '#2c2416' }}>End prices in $9</span>
                <ToggleSwitch
                  ariaLabel="End prices in $9"
                  on={(ps.priceRounding || 'nearest5') === 'charm9'}
                  onChange={() => updatePrintStore({ priceRounding: (ps.priceRounding || 'nearest5') === 'charm9' ? 'nearest5' : 'charm9' })}
                />
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 5, marginBottom: 0 }}>
                Prices ending in 9 tend to sell better ($39 instead of $40).
              </p>
            </div>

          </div>
          )}
        </div>

        {/* Shipping */}
        <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 11 }}>
          <AccordionHeader label="Shipping" open={openSection === 'shipping'} onClick={() => toggleSection('shipping')} />
          {openSection === 'shipping' && (
          <div className="space-y-4" style={{ marginTop: 13 }}>
            <Field label="Shipping speed">
              <div style={{ marginTop: 6 }}>
                <DesignPillToggle
                  value={ps.shippingMethod || 'standard'}
                  onChange={(v) => updatePrintStore({ shippingMethod: v })}
                  options={[
                    { value: 'standard', label: 'Standard' },
                    { value: 'budget', label: 'Budget' },
                  ]}
                />
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
                {(ps.shippingMethod || 'standard') === 'budget'
                  ? 'Cheaper (~$5–8), slower, and may not be tracked.'
                  : 'Tracked, faster (~3–7 days). ~$25 to the US.'}
              </p>
            </Field>

            <div>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: '#2c2416' }}>Offer free shipping</span>
                <ToggleSwitch ariaLabel="Offer free shipping" on={!!ps.freeShipping} onChange={() => updatePrintStore({ freeShipping: !ps.freeShipping })} />
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 5, marginBottom: 0 }}>
                Fold shipping into the print price so customers see “Free shipping” at checkout.
              </p>
              {ps.freeShipping && (
                <div style={{ marginTop: 10 }}>
                  <Field label="Shipping buffer ($)">
                    <input
                      className={inputCls}
                      style={inputStyle}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={bufferDollars}
                      onChange={(e) => {
                        const v = e.target.value
                        const n = parseFloat(v || 0)
                        updatePrintStore({ shippingBuffer: Number.isNaN(n) ? 0 : Math.round(n * 100) })
                      }}
                    />
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
                      Added to every print to cover shipping. Covers domestic; international may cost more and comes out of your margin.
                    </p>
                  </Field>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Payouts */}
        <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 11 }}>
          <AccordionHeader label="Payouts" open={openSection === 'payouts'} onClick={() => toggleSection('payouts')} />
          {openSection === 'payouts' && (
          <div style={{ marginTop: 12 }}>
            {payoutStatus === null ? (
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>Checking payout status…</p>
            ) : payoutsActive ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2e7d32', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#2c2416' }}>Active</span>
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
                  {earnings && earnings.count > 0
                    ? <>You’ve earned <strong style={{ color: 'var(--text-secondary)' }}>{money(earnings.total, earnings.currency)}</strong> across {earnings.count} {earnings.count === 1 ? 'sale' : 'sales'}. Stripe holds your balance.</>
                    : 'Earnings go to your Stripe account.'}
                </p>
                <button
                  type="button"
                  onClick={openDashboard}
                  disabled={openingDashboard}
                  style={{ marginTop: 8, color: '#8b6f47', background: 'none', border: 'none', padding: 0, cursor: openingDashboard ? 'default' : 'pointer', textDecoration: 'underline', fontSize: 11.5 }}
                >
                  {openingDashboard ? 'Opening…' : 'View Stripe dashboard →'}
                </button>
              </>
            ) : (
              <>
                {payoutsPending && (
                  <p style={{ fontSize: 13, color: '#9a7b2e', margin: '0 0 8px' }}>Verifying your details…</p>
                )}
                <button
                  type="button"
                  disabled={connecting}
                  onClick={handleConnect}
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: connecting ? 'var(--text-muted)' : '#2c2416',
                    border: '1px solid rgba(160,140,110,0.4)',
                    borderRadius: 5,
                    padding: '7px 14px',
                    background: 'rgba(255,253,248,0.7)',
                    cursor: connecting ? 'default' : 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!connecting) { e.currentTarget.style.background = 'rgba(255,253,248,1)'; e.currentTarget.style.borderColor = 'rgba(160,140,110,0.6)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,253,248,0.7)'; e.currentTarget.style.borderColor = 'rgba(160,140,110,0.4)' }}
                >
                  {connecting ? 'Redirecting…' : payoutsPending ? 'Resume setup' : 'Connect payouts'}
                </button>
                <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
                  {payoutsPending
                    ? 'Stripe is still verifying your account — this can take a few minutes. Resume setup if anything’s outstanding.'
                    : 'Get paid through Stripe. Required before you can sell.'}{' '}
                  <button
                    type="button"
                    onClick={() => setShowPayoutHelp(v => !v)}
                    style={{ color: '#8b6f47', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
                  >
                    How do payouts work?
                  </button>
                </p>
                {/* One panel, one message: a Stripe error takes over the box and
                    replaces the help copy — we never stack both. */}
                {(connectError || showPayoutHelp) && (
                  <div style={{ fontSize: 10.5, lineHeight: 1.55, marginTop: 8, padding: '10px 12px', background: connectError ? 'rgba(176,48,48,0.05)' : 'rgba(255,253,248,0.6)', border: `1px solid ${connectError ? 'rgba(176,48,48,0.28)' : 'rgba(160,140,110,0.12)'}`, borderRadius: 6, color: connectError ? '#b03030' : 'var(--text-muted)' }}>
                    {connectError ? (
                      <p style={{ margin: 0 }}>{withLinks(connectError)}</p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 6px' }}>Sepia pays you through Stripe, the same service that processes the payment.</p>
                        <p style={{ margin: '0 0 6px' }}>Click <strong style={{ color: 'var(--text-secondary)' }}>Connect payouts</strong> and Stripe opens a short, secure form to confirm your details and bank account. It takes a couple of minutes.</p>
                        <p style={{ margin: 0 }}>Once you’re connected, earnings from every print sale are deposited to your account automatically, minus Sepia’s commission.</p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </div>

        {/* Orders */}
        <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 14 }}>
          <a href="/studio/orders" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            View orders →
          </a>
        </div>
      </div>
    </PopoverShell>
  )
}

function formatVersionDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return String(ts)
  }
}

function HistoryView({ anchorEl, onClose, onBack, onRestore }) {
  const [versions, setVersions] = useState(null)
  const [restoring, setRestoring] = useState(null)

  useEffect(() => {
    fetch('/api/admin/history')
      .then(r => r.ok ? r.json() : { versions: [] })
      .then(d => setVersions(d.versions || []))
      .catch(() => setVersions([]))
  }, [])

  async function restore(ts) {
    setRestoring(ts)
    try {
      const res = await fetch(`/api/admin/history/${ts}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.config) {
        onRestore(data.config) // loads into the draft (marks dirty); user then Publishes
        onClose()
      }
    } finally {
      setRestoring(null)
    }
  }

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Version history" onBack={onBack}>
      <div style={{ padding: '4px 0 8px' }}>
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, padding: '8px 16px 10px' }}>
          A snapshot is saved each time you Publish. Restoring loads that version into your editor — Publish to make it live. Your newer versions stay here.
        </p>
        {versions === null ? (
          <p style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Loading…</p>
        ) : versions.length === 0 ? (
          <p style={{ padding: '6px 16px', fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>No published versions yet.</p>
        ) : (
          versions.map((v, i) => (
            <div
              key={v.ts}
              className="group"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderTop: DIVIDER_SOFT }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 12.5, color: '#2c2416', minWidth: 0 }}>
                {formatVersionDate(v.ts)}
                {i === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>Latest</span>}
              </span>
              <button
                type="button"
                disabled={restoring === v.ts}
                onClick={() => restore(v.ts)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ fontSize: 11, color: '#8b6f47', background: 'none', border: 'none', padding: 0, cursor: restoring === v.ts ? 'default' : 'pointer', textDecoration: 'underline', flexShrink: 0, marginLeft: 10 }}
              >
                {restoring === v.ts ? 'Restoring…' : 'Restore this version'}
              </button>
            </div>
          ))
        )}
      </div>
    </PopoverShell>
  )
}

export default function SiteSettingsPopover({ siteConfig, username, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon, onPickCoverImage, onViewCover, onDisableCover, onPickShareLarge, onPickShareSquare, onEditHandles, initialView = 'main' }) {
  const config = siteConfig || {}
  const [view, setView] = useState(initialView) // 'main' | 'cover' | 'domain' | 'analytics' | 'print' | 'sharing'
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)
  const [coverDesignOpen, setCoverDesignOpen] = useState(false)
  const [subheadingMdOpen, setSubheadingMdOpen] = useState(false)
  const coverBrushRef = useRef(null)
  const footer = config.footer || {}

  function update(patch) {
    onUpdate({ ...config, ...patch })
  }

  function updateAnalytics(patch) {
    update({ analytics: { ...(config.analytics || {}), ...patch } })
  }

  function updateFooter(patch) {
    update({ footer: { ...(config.footer || {}), ...patch } })
  }

  function updateCover(patch) {
    update({ cover: { ...(config.cover || {}), ...patch } })
  }

  function updateShare(patch) {
    update({ share: { ...(config.share || {}), ...patch } })
  }

  function updatePrintStore(patch) {
    update({ printStore: { ...(config.printStore || {}), ...patch } })
  }

  const rootDomain = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const hasAnalytics = !!(config.analytics?.googleId || config.analytics?.plausibleDomain)
  const logoType = config.logoType || 'sitename'

  const brushButton = (
    <HeaderIconButton innerRef={brushRef} onClick={() => setDesignOpen(v => !v)} title="Design">
      <BrushIcon />
    </HeaderIconButton>
  )

  // ── Cover page drill-in ───────────────────────────────────────────────────
  if (view === 'cover') {
    const cover = config.cover || {}
    const themeFonts = getTheme(config?.design?.theme)?.tokens?.fonts || {}
    // Drop options that resolve to the same font on this theme (e.g. Display and
    // Editorial can be identical), so we never show two indistinguishable choices.
    const seenFonts = new Set()
    const fontOpts = COVER_FONT_OPTIONS.filter(f => {
      const fam = themeFonts[f.id] || f.id
      if (seenFonts.has(fam)) return false
      seenFonts.add(fam); return true
    }).map(f => ({
      value: f.id,
      label: <span style={{ fontFamily: themeFonts[f.id], fontSize: 13 }}>{f.label}</span>,
    }))
    const hasLogo = config.logoType === 'image' && !!config.logo
    // A logo carries the brand mark, so when one is set (and no explicit cover
    // heading), the design panel offers Logo controls instead of a Heading Font.
    const showLogoControls = hasLogo && !cover.heading

    const coverBrushButton = (
      <HeaderIconButton innerRef={coverBrushRef} onClick={() => setCoverDesignOpen(v => !v)} title="Cover design">
        <BrushIcon />
      </HeaderIconButton>
    )

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Cover page" onBack={initialView === 'cover' ? undefined : () => setView('main')} headerRight={coverBrushButton}>
        <div style={{ padding: '14px 14px 16px' }} className="space-y-5">
          {(() => {
            const coverImages = (cover.images && cover.images.length) ? cover.images : (cover.imageUrl ? [cover.imageUrl] : [])
            return (
              <Field label="Cover images">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {coverImages.map((url, i) => (
                    <div key={`${url}-${i}`} style={{ position: 'relative', width: 58, height: 42 }}>
                      <img src={getSizedUrl(url, 'thumbnail') || url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => { const next = coverImages.filter((u, j) => !(u === url && j === i)); updateCover({ images: next, imageUrl: next[0] || '' }) }}
                        style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 999, background: '#2c2416', color: '#fff', border: '1.5px solid var(--popover)', fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    aria-label="Add cover image"
                    onClick={onPickCoverImage}
                    style={{ width: 58, height: 42, border: '1px dashed rgba(120,110,95,0.5)', borderRadius: 4, color: 'var(--text-muted)', background: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                  >+</button>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted, #9e9788)', margin: '6px 0 0', lineHeight: 1.45 }}>
                  {coverImages.length > 1 ? 'These cross-fade as a slideshow on the cover.' : 'Add more to cross-fade them as a slideshow.'}
                </p>
              </Field>
            )
          })()}
          <Field label="Heading">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder={config.siteName || 'My Portfolio'}
              value={cover.heading || ''}
              onChange={(e) => updateCover({ heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder={config.tagline || 'Short description'}
              value={cover.subheading || ''}
              onChange={(e) => updateCover({ subheading: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setSubheadingMdOpen(true)}
              style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-secondary, #6b6355)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Edit with formatting (bold, italic, links)
            </button>
          </Field>
          <Field label="Button text">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder="View my portfolio"
              value={cover.buttonText || ''}
              onChange={(e) => updateCover({ buttonText: e.target.value })}
            />
          </Field>
        </div>
        {coverDesignOpen && (
          <PopoverShell anchorEl={coverBrushRef.current} onClose={() => setCoverDesignOpen(false)} width="max-content" minWidth={272} maxWidth="calc(100vw - 24px)" title="Cover Design">
            <DesignSection label="Layout">
              <DesignPillToggle
                value={cover.layout || 'centered'}
                onChange={(v) => updateCover({ layout: v })}
                options={[
                  { value: 'centered', label: 'Centered' },
                  { value: 'bottom',   label: 'Bottom'   },
                  { value: 'split',    label: 'Split'    },
                  { value: 'minimal',  label: 'Minimal'  },
                ]}
              />
            </DesignSection>
            {cover.imageUrl && !['split', 'minimal'].includes(cover.layout) && (
              <DesignSection label="Overlay">
                <DesignPillToggle
                  value={cover.overlay || 'medium'}
                  onChange={(v) => updateCover({ overlay: v })}
                  options={[
                    { value: 'light',  label: 'Light'  },
                    { value: 'medium', label: 'Medium' },
                    { value: 'dark',   label: 'Dark'   },
                  ]}
                />
              </DesignSection>
            )}
            {showLogoControls ? (
              <>
                <DesignSection label="Logo Size">
                  <DesignPillToggle
                    value={cover.logoSize || 'medium'}
                    onChange={(v) => updateCover({ logoSize: v })}
                    options={[
                      { value: 'small',  label: 'S' },
                      { value: 'medium', label: 'M' },
                      { value: 'large',  label: 'L' },
                    ]}
                  />
                </DesignSection>
                <DesignSection label="Logo Color">
                  <DesignPillToggle
                    value={cover.logoColor || 'light'}
                    onChange={(v) => updateCover({ logoColor: v })}
                    options={[
                      { value: 'light',    label: 'Light'    },
                      { value: 'dark',     label: 'Dark'     },
                      { value: 'original', label: 'Original' },
                    ]}
                  />
                </DesignSection>
              </>
            ) : (
              <DesignSection label="Heading Font">
                <DesignPillToggle
                  value={cover.titleFont || 'serif'}
                  onChange={(v) => updateCover({ titleFont: v })}
                  options={fontOpts}
                />
              </DesignSection>
            )}
            <DesignSection label="Subheading Font">
              <DesignPillToggle
                value={cover.descriptionFont || 'serif'}
                onChange={(v) => updateCover({ descriptionFont: v })}
                options={fontOpts}
              />
            </DesignSection>
            <DesignSection label="Button Font">
              <DesignPillToggle
                value={cover.buttonFont || 'sans'}
                onChange={(v) => updateCover({ buttonFont: v })}
                options={fontOpts}
              />
            </DesignSection>
            <DesignSection label="Button Style">
              <DesignPillToggle
                value={cover.buttonStyle || 'solid'}
                onChange={(v) => updateCover({ buttonStyle: v })}
                options={[
                  { value: 'solid',   label: 'Solid'   },
                  { value: 'outline', label: 'Outline' },
                ]}
              />
            </DesignSection>
          </PopoverShell>
        )}
        {/* Rich-text editor for the subheading — the block markdown editor in
            inline-only mode (bold / italic / links; no headings or images). */}
        <MarkdownEditorPanel
          inlineOnly
          open={subheadingMdOpen}
          block={{ content: cover.subheading || '', format: 'markdown' }}
          onChange={(b) => updateCover({ subheading: b.content })}
          onClose={() => setSubheadingMdOpen(false)}
        />
      </PopoverShell>
    )
  }

  // ── Domain drill-in ───────────────────────────────────────────────────────
  if (view === 'domain') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Custom Domain" onBack={() => setView('main')}>
        <DomainPanel siteConfig={config} username={username} onUpdate={onUpdate} />
      </PopoverShell>
    )
  }

  // ── Analytics drill-in ────────────────────────────────────────────────────
  if (view === 'analytics') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Analytics" onBack={() => setView('main')}>
        <div style={{ padding: '14px' }} className="space-y-5">
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary, #6b6355)', margin: 0 }}>
            Track your visitors with{' '}
            <strong style={{ color: '#2c2416', fontWeight: 500 }}>Google Analytics</strong> or{' '}
            <strong style={{ color: '#2c2416', fontWeight: 500 }}>Plausible</strong>. Add either one below and check your
            stats in that tool&rsquo;s dashboard.
          </p>
          <Field label="Google Analytics ID">
            <input autoFocus className={inputCls} style={inputStyle} placeholder="G-XXXXXXXXXX" value={config.analytics?.googleId || ''} onChange={(e) => updateAnalytics({ googleId: e.target.value })} />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted, #9e9788)', margin: '6px 0 0', lineHeight: 1.45 }}>
              Grab your ID in Google Analytics → Admin → Data Streams (<span style={{ fontFamily: MONO }}>G-XXXXXXXXXX</span>).
            </p>
          </Field>
          <Field label="Plausible domain">
            <input className={inputCls} style={inputStyle} placeholder="yourdomain.com" value={config.analytics?.plausibleDomain || ''} onChange={(e) => updateAnalytics({ plausibleDomain: e.target.value })} />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted, #9e9788)', margin: '6px 0 0', lineHeight: 1.45 }}>
              The site domain you added to your Plausible account.
            </p>
          </Field>
        </div>
      </PopoverShell>
    )
  }

  // ── Print store drill-in ──────────────────────────────────────────────────
  if (view === 'history') {
    return <HistoryView anchorEl={anchorEl} onClose={onClose} onBack={() => setView('main')} onRestore={onUpdate} />
  }

  if (view === 'print') {
    const ps = config.printStore || {}
    return <PrintView anchorEl={anchorEl} onClose={onClose} ps={ps} updatePrintStore={updatePrintStore} onBack={() => setView('main')} />
  }

  // ── Sharing drill-in ──────────────────────────────────────────────────────
  if (view === 'sharing') {
    const share = config.share || {}
    const largeImage = share.largeImage || config.cover?.imageUrl || ''
    const squareImage = share.squareImage || config.cover?.imageUrl || ''
    const previewSubdomain = username || 'yoursite'
    const domain = normalizeCustomDomain(config.customDomain)?.name || subdomainHost(previewSubdomain, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
    const siteName = config.siteName || 'My Portfolio'
    const tagline = config.tagline || ''
    const cardBorder = '1px solid rgba(160,140,110,0.22)'

    const ChangeBadge = ({ size = 30 }) => (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: size, height: size,
          background: 'rgba(20,12,4,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
        }}
      >
        <svg width={size === 30 ? 14 : 12} height={size === 30 ? 14 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
    )

    const EmptyBadge = () => (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: 36, height: 36,
          background: 'rgba(160,140,110,0.20)',
          border: '1px solid rgba(160,140,110,0.32)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(120,90,60,0.80)" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </div>
    )

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Social Sharing" onBack={() => setView('main')}>
        <div style={{ padding: '14px' }} className="space-y-4">

          {/* Intro */}
          <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            How your site appears when shared online or in search results. Change an image below if you’d like. Individual pages can override with their own settings.
          </p>

          {/* Large card */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Social card</div>
            <div
              className="group relative w-full cursor-pointer overflow-hidden"
              style={{ paddingBottom: '52.5%', border: cardBorder, borderRadius: 4 }}
              onClick={onPickShareLarge}
            >
              <div className="absolute inset-0" style={{ background: 'rgba(160,140,110,0.10)' }}>
                {largeImage && <img src={largeImage} className="w-full h-full object-cover" alt="" />}
              </div>
              {/* Centered change-image affordance — subtle by default, prominent on hover */}
              <div
                className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${largeImage ? 'opacity-65 group-hover:opacity-100' : 'opacity-100'}`}
                style={{ paddingBottom: 60 }}
              >
                {largeImage ? <ChangeBadge /> : <EmptyBadge />}
              </div>
              <div className="absolute bottom-0 left-0 right-0" style={{ background: 'rgba(255,253,248,0.96)', borderTop: cardBorder, padding: '6px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2c2416' }} className="truncate">{siteName}</div>
                {tagline && <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }} className="truncate">{tagline}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 1 }} className="truncate">{domain}</div>
              </div>
            </div>
            {share.largeImage && (
              <button type="button" onClick={() => updateShare({ largeImage: '' })} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Remove override</button>
            )}
          </div>

          {/* Compact card — square 72×72 thumb */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Compact card</div>
            <div
              className="group flex cursor-pointer overflow-hidden"
              style={{ border: cardBorder, borderRadius: 4, height: 72 }}
              onClick={onPickShareSquare}
            >
              <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 72, height: 72, background: 'rgba(160,140,110,0.10)' }}>
                {squareImage && <img src={squareImage} className="w-full h-full object-cover" alt="" />}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${squareImage ? 'opacity-65 group-hover:opacity-100' : 'opacity-100'}`}
                >
                  {squareImage ? <ChangeBadge size={26} /> : <EmptyBadge />}
                </div>
              </div>
              <div className="flex-1 min-w-0 px-3 flex flex-col justify-center" style={{ borderLeft: cardBorder }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2c2416' }} className="truncate">{siteName}</div>
                {tagline && <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }} className="truncate">{tagline}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 1 }} className="truncate">{domain}</div>
              </div>
            </div>
            {share.squareImage && (
              <button type="button" onClick={() => updateShare({ squareImage: '' })} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Remove override</button>
            )}
          </div>

          {/* Google search result */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Search result</div>
            <div style={{ border: cardBorder, borderRadius: 4, padding: '10px 12px' }} className="space-y-0.5">
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }} className="truncate">{domain}</div>
              <div style={{ fontSize: 12, color: '#1d4fb1' }} className="truncate">{siteName}</div>
              {tagline && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }} className="line-clamp-2">{tagline}</div>}
            </div>
          </div>
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings" headerRight={brushButton}>

      {/* Identity */}
      <div style={{ padding: '14px 14px 16px', borderBottom: DIVIDER_STRONG }} className="space-y-5">
        <Field label="Site name">
          <EditableInput className={inputCls} style={inputStyle} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <EditableInput className={inputCls} style={inputStyle} placeholder="A short line for your cover and search results" value={config.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} />
        </Field>

        <Field label="Footer text">
          <input
            className={inputCls}
            style={inputStyle}
            value={footer.customText || `© ${new Date().getFullYear()} ${config.siteName || 'My Portfolio'}`}
            onChange={(e) => updateFooter({ customText: e.target.value })}
          />
        </Field>

        {/* Logo */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: MONO,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Logo
          </div>
          <div className="mb-2.5">
            <DesignPillToggle
              value={logoType}
              onChange={(v) => update({ logoType: v })}
              options={[
                { value: 'sitename', label: 'Site name' },
                { value: 'image',    label: 'Image'     },
              ]}
            />
          </div>
          {logoType === 'image' && (
            <AssetField
              value={config.logo || ''}
              onChange={(v) => update({ logo: v })}
              onPickFromLibrary={onPickLogo}
              contain
            />
          )}
        </div>

        <AssetField
          label="Favicon"
          value={config.favicon || ''}
          onChange={(v) => update({ favicon: v })}
          fallbackUrl={logoType === 'image' ? (config.logo || '') : ''}
          onPickFromLibrary={onPickFavicon}
          small
        />
      </div>

      {/* Cover page lives in the sidebar now — not repeated here. */}

      {/* Drill rows — each shows a right-side status: a state word when configured,
          else "Set up". */}
      <DrillRow
        label="Print store"
        status={config.printStore?.enabled ? 'On' : 'Set up'}
        onDrillIn={() => setView('print')}
      />
      <DrillRow
        label="Custom domain"
        status={normalizeCustomDomain(config.customDomain) ? 'Connected' : 'Set up'}
        onDrillIn={() => setView('domain')}
      />
      <DrillRow
        label="Analytics"
        status={hasAnalytics ? '' : 'Set up'}
        onDrillIn={() => setView('analytics')}
      />
      <DrillRow
        label="Social sharing"
        onDrillIn={() => setView('sharing')}
      />
      <DrillRow
        label="Version history"
        onDrillIn={() => setView('history')}
      />

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width={300} maxWidth="calc(100vw - 24px)" title="Design">
          <DesignControlsBody config={config} onChange={update} onEditHandles={onEditHandles} includeTheme />
        </PopoverShell>
      )}

    </PopoverShell>
  )
}
