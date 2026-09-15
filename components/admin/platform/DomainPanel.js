// components/admin/platform/DomainPanel.js
import { useState, useEffect, useRef } from 'react'
import { normalizeCustomDomain } from '../../../common/domainUtils'

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'
const input = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(160,140,110,0.32)', padding: '0 0 7px',
  fontSize: 13, color: '#2c2416', outline: 'none',
}
const label = { fontSize: 10, fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }

function StatusBadge({ status }) {
  const map = {
    active:  ['Connected', '#2e7d32', '🔒'],
    pending: ['Pending DNS', '#9a7b2e', '●'],
    error:   ['Error', '#b03030', '⚠'],
  }
  const [text, color, glyph] = map[status] || map.pending
  return (
    <span style={{ fontSize: 11, color, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 9 }}>{glyph}</span>{text}
    </span>
  )
}

// A read-only labeled detail row (registrar, nameservers, connected date…).
function InfoRow({ field, value, mono, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 2px',
      borderTop: '1px solid rgba(160,140,110,0.14)',
    }}>
      <span style={{ ...label, width: 78, flexShrink: 0 }}>{field}</span>
      <span style={{ fontFamily: mono ? MONO : 'inherit', fontSize: 12, color: '#2c2416', flex: 1, wordBreak: 'break-all', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
        {children ?? value}
      </span>
    </div>
  )
}

// Which DNS record a copyable group is for, so a user staring at two rows knows
// the first serves the bare domain and the second makes www redirect to it.
function recordCaption(r) {
  if (r.name === '@') return 'Root domain'
  if (r.name === 'www') return 'www → root domain'
  if (r.type === 'TXT') return 'Ownership check'
  return null
}

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return null }
}

// One labeled DNS field with a one-click copy.
function CopyRow({ field, value }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button type="button" onClick={copy}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        background: 'none', border: 'none', padding: '6px 2px', cursor: 'pointer',
        borderTop: '1px solid rgba(160,140,110,0.14)',
      }}
      title="Click to copy">
      <span style={{ ...label, width: 42, flexShrink: 0 }}>{field}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, color: '#2c2416', flex: 1, wordBreak: 'break-all' }}>{value}</span>
      <span style={{ fontSize: 10, color: copied ? '#2e7d32' : 'var(--text-muted)', flexShrink: 0, width: 56, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {copied ? 'Copied ✓' : 'Copy ⧉'}
      </span>
    </button>
  )
}

export default function DomainPanel({ siteConfig, username, onUpdate }) {
  const config = siteConfig || {}
  const [cd, setCd] = useState(() => normalizeCustomDomain(config.customDomain))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState(null)
  const [nameservers, setNameservers] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const pollRef = useRef(null)

  function persist(next) {
    setCd(next)
    onUpdate({ ...config, customDomain: next })
  }

  async function connect(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/admin/domain/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not connect domain'); return }
      persist(data.customDomain); setName('')
    } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true)
    try { await fetch('/api/admin/domain', { method: 'DELETE' }); persist(null); setProvider(null) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/domain/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } finally { setSearching(false) }
    }, 450)
    return () => clearTimeout(t)
  }, [query])

  // Detect the domain's DNS provider + nameservers — for tailored setup guidance
  // while pending, and as reassuring "here's where it lives" detail once active.
  useEffect(() => {
    if (!cd) { setProvider(null); setNameservers(null); return }
    let alive = true
    fetch(`/api/admin/domain/provider?name=${encodeURIComponent(cd.name)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!alive || !d) return
        setProvider(d.provider?.name ? d.provider : null)
        setNameservers(Array.isArray(d.nameservers) && d.nameservers.length ? d.nameservers : null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [cd?.name, cd?.status])

  // Reconcile with Vercel on mount — once even for an already-active domain, so
  // the server can backfill the www redirect for apex domains connected before
  // that existed — then keep polling only while still pending. Persist only on a
  // real change, so re-opening Settings on a stable domain doesn't churn autosave.
  useEffect(() => {
    if (!cd) return
    let alive = true
    const sync = async () => {
      const res = await fetch('/api/admin/domain/status')
      if (!res.ok) return
      const data = await res.json()
      if (!alive || !data.customDomain) return
      // Persist only on a real change so re-opening Settings on a stable domain
      // doesn't churn autosave. Compare against the cd this effect was set up with.
      if (JSON.stringify(cd) === JSON.stringify(data.customDomain)) return
      onUpdate({ ...config, customDomain: data.customDomain })
      setCd(data.customDomain)
    }
    sync()
    if (cd.status !== 'active') pollRef.current = setInterval(sync, 5000)
    return () => { alive = false; clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd?.name, cd?.status])

  const removeBtn = (
    <button type="button" onClick={remove} disabled={busy}
      style={{ fontSize: 11, color: '#b03030', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      Remove domain
    </button>
  )

  return (
    <div style={{ padding: 14 }} className="space-y-5">
      <div className="space-y-2">
        {!cd && <div style={label}>Connect a domain you own</div>}

        {!cd && (
          <form onSubmit={connect} className="space-y-2">
            <input autoFocus style={input} placeholder="yourname.com" value={name}
              onChange={(e) => setName(e.target.value)} />
            {error && <p style={{ fontSize: 10.5, color: '#b03030' }}>{error}</p>}
            <button type="submit" disabled={busy || !name.trim()}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(160,140,110,0.4)', background: 'rgba(255,253,248,0.7)', cursor: 'pointer' }}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        )}

        {cd && cd.status === 'active' && (() => {
          const rec = (cd.verification || [])[0]
          const pointsTo = rec ? `${rec.value}` : null
          const connectedOn = formatDate(cd.verifiedAt || cd.addedAt)
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: '#2c2416' }}>{cd.name}</span>
                <a href={`https://${cd.name}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: '#5c4f3a', textDecoration: 'underline' }}>Visit&nbsp;→</a>
              </div>

              {/* Where this domain actually lives — reassurance you can go manage it. */}
              <div>
                {provider?.name && (
                  <InfoRow field="Registrar">
                    {provider.name}
                    {provider.dnsUrl && (
                      <>{'  '}
                        <a href={provider.dnsUrl} target="_blank" rel="noreferrer"
                          style={{ color: '#5c4f3a', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                          Manage DNS →
                        </a>
                      </>
                    )}
                  </InfoRow>
                )}
                {nameservers && <InfoRow field="Nameservers" value={nameservers.join('\n')} mono />}
                {pointsTo && <InfoRow field="Points to" value={pointsTo} mono />}
                {connectedOn && <InfoRow field="Connected" value={connectedOn} />}
              </div>

              {removeBtn}
            </div>
          )
        })()}

        {cd && cd.status !== 'active' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: '#2c2416' }}>{cd.name}</span>
              <StatusBadge status={cd.status} />
            </div>

            {/* Where to go — provider-specific when we can detect it */}
            {(() => {
              const recordsWord = (cd.verification || []).length > 1 ? 'these records' : 'this record'
              return (
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {provider?.name
                    ? <>Looks like <strong>{cd.name}</strong> is on <strong>{provider.name}</strong>. Add {recordsWord} there:</>
                    : <>Add {recordsWord} at your domain’s DNS provider:</>}
                </p>
              )
            })()}
            {provider?.dnsUrl && (
              <a href={provider.dnsUrl} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', fontSize: 11, color: '#5c4f3a', textDecoration: 'underline' }}>
                Open {provider.name} DNS settings →
              </a>
            )}

            {/* Each record, broken into copyable fields and captioned by purpose */}
            <div style={{ borderTop: '1px solid rgba(160,140,110,0.14)' }}>
              {(cd.verification || []).map((r, i) => {
                const caption = recordCaption(r)
                return (
                  <div key={i} style={{ marginTop: i > 0 ? 12 : 0 }}>
                    {caption && (
                      <div style={{ ...label, paddingTop: i > 0 ? 4 : 0 }}>{caption}</div>
                    )}
                    <CopyRow field="Type"  value={r.type} />
                    <CopyRow field="Name"  value={r.name} />
                    <CopyRow field="Value" value={r.value} />
                  </div>
                )
              })}
            </div>

            {removeBtn}
          </div>
        )}
      </div>

      {!cd && (
        <div className="space-y-2" style={{ borderTop: '1px solid rgba(160,140,110,0.12)', paddingTop: 14 }}>
          <div style={label}>Find a new domain</div>
          <input style={input} placeholder="Try a name or keyword" value={query}
            onChange={(e) => setQuery(e.target.value)} />
          {results && (
            <div className="scroll-thin" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {results.map((r) => (
                <div key={r.domain} className="flex items-center justify-between" style={{ fontSize: 12, padding: '3px 0' }}>
                  <span style={{ fontFamily: MONO, color: r.available ? '#2c2416' : 'var(--text-muted)' }}>{r.domain}</span>
                  {r.available ? (
                    <span className="flex items-center gap-2">
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>${r.price}/yr</span>
                      <a href={r.registrarUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: '#5c4f3a', textDecoration: 'underline' }}>Get it</a>
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Taken</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {(query.trim()) && (
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              {searching ? 'Searching…' : 'After you buy it, come back and connect it above.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
