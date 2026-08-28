import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'

// Platform-operator screen for minting and tracking invite codes. Standalone
// (not the tenant editor) — it only talks to /api/admin/invites, which enforces
// isPlatformAdmin, so a non-operator who reaches this URL just sees "not authorized".

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'
const DESK = '#e8e2d9'
const INK = '#2c2416'

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function usesLabel(inv) {
  const max = inv.maxUses == null ? '∞' : inv.maxUses
  return `${inv.uses || 0} / ${max} used`
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      style={{
        fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: copied ? '#5a7a4a' : '#9a876b', background: 'transparent', border: 'none',
        cursor: 'pointer', padding: '4px 6px', transition: 'color 0.15s',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function AdminInvites() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invites, setInvites] = useState([])
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'forbidden' | 'error'
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState('')
  const [justMinted, setJustMinted] = useState('') // code string to highlight

  // form fields
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [trialDays, setTrialDays] = useState('60')
  const [expiresAt, setExpiresAt] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invites')
      if (res.status === 403) return setLoadState('forbidden')
      if (res.status === 401) return router.replace('/auth/signin')
      if (!res.ok) return setLoadState('error')
      const body = await res.json()
      const list = (body.invites || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setInvites(list)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
    if (status === 'authenticated') load()
  }, [status, load, router])

  async function handleMint(e) {
    e.preventDefault()
    setMinting(true)
    setMintError('')
    try {
      const payload = {}
      if (code.trim()) payload.code = code.trim()
      if (label.trim()) payload.label = label.trim()
      if (maxUses !== '') payload.maxUses = Number(maxUses)
      if (trialDays !== '') payload.trialDays = Number(trialDays)
      // End of the selected day, not midnight: a code meant to be valid
      // "through Sept 1" should still work on Sept 1.
      if (expiresAt) payload.expiresAt = new Date(`${expiresAt}T23:59:59.999Z`).toISOString()

      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 403) { setMintError('Your account is not a platform operator.'); setMinting(false); return }
      if (res.status === 409) { setMintError('That code already exists. Pick a different one.'); setMinting(false); return }
      if (!res.ok) { setMintError('Could not mint that code. Try a different code.'); setMinting(false); return }
      const { invite } = await res.json()
      setInvites((prev) => [invite, ...prev.filter((i) => i.code !== invite.code)])
      setJustMinted(invite.code)
      setCode(''); setLabel(''); setMaxUses(''); setExpiresAt('')
      setMinting(false)
    } catch {
      setMintError('Something went wrong. Please try again.')
      setMinting(false)
    }
  }

  if (status === 'loading' || loadState === 'loading') {
    return <Shell><p style={{ color: '#8a7a62', fontFamily: MONO, fontSize: 13 }}>Loading…</p></Shell>
  }
  if (loadState === 'forbidden') {
    return (
      <Shell>
        <h1 className="font-fraunces" style={{ fontSize: 28, color: INK, marginBottom: 10 }}>Not authorized</h1>
        <p style={{ color: '#8a7a62', fontSize: 15, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
          This screen is for platform operators. Ask an admin to add your email to <code style={{ fontFamily: MONO }}>SEPIA_ADMIN_EMAILS</code>.
        </p>
      </Shell>
    )
  }
  if (loadState === 'error') {
    return (
      <Shell>
        <p style={{ color: '#a0451e', fontSize: 15 }}>Couldn&apos;t load invite codes.</p>
        <button onClick={load} style={btnGhost}>Retry</button>
      </Shell>
    )
  }

  return (
    <Shell align="stretch">
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
        <h1 className="font-fraunces" style={{ fontSize: 30, color: INK, marginBottom: 6 }}>Invite codes</h1>
        <p style={{ fontFamily: MONO, fontSize: 12, color: '#a8967a', letterSpacing: '0.04em', marginBottom: 30 }}>
          Mint a code, share it, and new photographers can create a site with it.
        </p>

        {/* ── Mint form ─────────────────────────────────────────── */}
        <form onSubmit={handleMint} style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Code (optional)" hint="blank = auto-generate">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SEPIA-EARLY" style={inputStyle} spellCheck={false} autoComplete="off" />
            </Field>
            <Field label="Label" hint="a note to yourself">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Early access" style={inputStyle} autoComplete="off" />
            </Field>
            <Field label="Max uses" hint="blank = unlimited">
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))} placeholder="unlimited" inputMode="numeric" style={inputStyle} />
            </Field>
            <Field label="Trial days">
              <input value={trialDays} onChange={(e) => setTrialDays(e.target.value.replace(/[^0-9]/g, ''))} placeholder="60" inputMode="numeric" style={inputStyle} />
            </Field>
            <Field label="Expires" hint="blank = never">
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {mintError && <p style={{ color: '#a0451e', fontSize: 13, marginTop: 14 }}>{mintError}</p>}

          <button type="submit" disabled={minting} style={{ ...btnPrimary, marginTop: 18, opacity: minting ? 0.5 : 1, cursor: minting ? 'not-allowed' : 'pointer' }}>
            {minting ? 'Minting…' : 'Mint code'}
          </button>
        </form>

        {/* ── List ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 34 }}>
          {invites.length === 0 ? (
            <p style={{ color: '#a8967a', fontSize: 14, textAlign: 'center', padding: '30px 0' }}>No codes yet. Mint your first one above.</p>
          ) : (
            invites.map((inv) => {
              const redeemed = (inv.redeemedBy || []).length
              const highlight = inv.code === justMinted
              return (
                <div key={inv.code} style={{ ...rowStyle, borderColor: highlight ? '#8b6f47' : 'rgba(120,100,70,0.16)', background: highlight ? 'rgba(139,111,71,0.06)' : 'rgba(255,255,255,0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', color: INK }}>{inv.code}</span>
                    <CopyButton text={inv.code} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
                    {inv.label ? <span style={{ fontSize: 13, color: '#5a4a36' }}>{inv.label}</span> : null}
                    <span style={metaPill}>{usesLabel(inv)}</span>
                    <span style={metaPill}>trial {inv.trialDays ?? 60}d</span>
                    <span style={metaPill}>{inv.expiresAt ? `expires ${fmtDate(inv.expiresAt)}` : 'no expiry'}</span>
                    {redeemed > 0 ? <span style={metaPill}>{redeemed} redeemed</span> : null}
                    {inv.createdAt ? <span style={{ ...metaPill, color: '#b0a084' }}>added {fmtDate(inv.createdAt)}</span> : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Shell>
  )
}

// ── little presentational helpers ──────────────────────────────
function Shell({ children, align = 'center' }) {
  return (
    <div
      className="font-sans"
      style={{
        minHeight: '100vh', background: DESK, padding: '56px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8967a', marginBottom: 6 }}>
        {label}{hint ? <span style={{ textTransform: 'none', letterSpacing: 0, color: '#c4b49a' }}> · {hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(120,100,70,0.18)',
  borderRadius: 10, padding: 22,
}
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid rgba(120,100,70,0.3)',
  borderRadius: 6, background: 'rgba(255,255,255,0.7)', outline: 'none',
  fontFamily: MONO, fontSize: 13.5, color: INK, boxSizing: 'border-box',
}
const btnPrimary = {
  padding: '12px 26px', background: INK, color: '#f6f3ec', border: 'none', borderRadius: 6,
  fontFamily: MONO, fontSize: 12, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase',
}
const btnGhost = {
  marginTop: 14, padding: '10px 20px', background: 'transparent', color: INK,
  border: '1px solid rgba(120,100,70,0.4)', borderRadius: 6, cursor: 'pointer',
  fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
}
const rowStyle = {
  border: '1px solid rgba(120,100,70,0.16)', borderRadius: 8, padding: '14px 16px', marginBottom: 10,
  transition: 'background 0.2s, border-color 0.2s',
}
const metaPill = { fontFamily: MONO, fontSize: 11, color: '#8a7a62', letterSpacing: '0.03em' }
