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
  const map = { active: ['Active', '#2e7d32'], pending: ['Pending DNS', '#9a7b2e'], error: ['Error', '#b03030'] }
  const [text, color] = map[status] || map.pending
  return (
    <span style={{ fontSize: 11, color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {status === 'active' ? '🔒 ' : ''}{text}
    </span>
  )
}

export default function DomainPanel({ siteConfig, username, onUpdate }) {
  const config = siteConfig || {}
  const [cd, setCd] = useState(() => normalizeCustomDomain(config.customDomain))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
    try { await fetch('/api/admin/domain', { method: 'DELETE' }); persist(null) }
    finally { setBusy(false) }
  }

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/domain/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    } finally { setSearching(false) }
  }

  // Poll status until active.
  useEffect(() => {
    if (!cd || cd.status === 'active') return
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/admin/domain/status')
      if (!res.ok) return
      const data = await res.json()
      if (data.customDomain) persist(data.customDomain)
    }, 5000)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd?.name, cd?.status])

  return (
    <div style={{ padding: 14 }} className="space-y-5">
      <div className="space-y-2">
        <div style={label}>Connect a domain you own</div>
        {cd ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: '#2c2416' }}>{cd.name}</span>
              <StatusBadge status={cd.status} />
            </div>
            {cd.status !== 'active' && (cd.verification || []).map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Add a <strong>{r.type}</strong> record — host{' '}
                <code style={{ fontFamily: MONO }}>{r.name}</code> → value{' '}
                <button type="button" onClick={() => navigator.clipboard?.writeText(r.value)}
                  style={{ fontFamily: MONO, background: 'rgba(160,140,110,0.12)', border: 'none', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>
                  {r.value}
                </button>
              </div>
            ))}
            {cd.status !== 'active' && (
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Add this at your DNS provider. It activates automatically once detected.</p>
            )}
            <button type="button" onClick={remove} disabled={busy}
              style={{ fontSize: 11, color: '#b03030', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Remove domain
            </button>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-2">
            <input autoFocus style={input} placeholder="photos.yourname.com" value={name}
              onChange={(e) => setName(e.target.value)} />
            {error && <p style={{ fontSize: 10.5, color: '#b03030' }}>{error}</p>}
            <button type="submit" disabled={busy || !name.trim()}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(160,140,110,0.4)', background: 'rgba(255,253,248,0.7)', cursor: 'pointer' }}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-2" style={{ borderTop: '1px solid rgba(160,140,110,0.12)', paddingTop: 14 }}>
        <div style={label}>Find a new domain</div>
        <form onSubmit={search}>
          <input style={input} placeholder="Find a new domain (e.g. your name)" value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </form>
        {searching && <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Searching…</p>}
        {results && results.map((r) => (
          <div key={r.domain} className="flex items-center justify-between" style={{ fontSize: 12 }}>
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
        {results && <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>After you buy it, come back and connect it above.</p>}
      </div>
    </div>
  )
}
