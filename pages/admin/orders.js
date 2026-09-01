import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

function money(cents, currency = 'USD') {
  if (typeof cents !== 'number') return '—'
  const v = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${v}` : `${v} ${currency}`
}

const STATUS_LABEL = {
  pending: 'Pending', paid: 'Paid', placed: 'In production',
  shipped: 'Shipped', fulfillment_failed: 'Needs attention', canceled: 'Canceled',
}

// Warm Sepia palette, matching the legal pages and admin chrome.
const INK = '#1a1410'
const BODY = '#3a362f'
const MUTED = '#9e9788'
const ACCENT = '#8b6f47'
const HAIRLINE = 'rgba(160,140,110,0.28)'
const HAIRLINE_SOFT = 'rgba(160,140,110,0.14)'
const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

const th = {
  padding: '0 8px 10px',
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: MUTED,
}
const td = { padding: '11px 8px', fontSize: 13.5, color: BODY, verticalAlign: 'top' }

function Shell({ children }) {
  return (
    <>
      <Head>
        <title>Orders · Sepia</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#faf7f0', color: INK }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px 96px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 30 }}>
            <Link href="/admin" style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: INK, textDecoration: 'none' }}>
              Sepia
            </Link>
            <Link href="/admin" style={{ fontSize: 12.5, color: ACCENT, textDecoration: 'none' }}>← Back to editor</Link>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

export default function OrdersPage() {
  const { status: authStatus } = useSession()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    fetch('/api/admin/print/orders')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => setOrders(d.orders || []))
      .catch(() => setError('Could not load orders.'))
  }, [authStatus])

  if (authStatus === 'loading') return <Shell><p style={{ color: MUTED, fontSize: 14 }}>Loading…</p></Shell>
  if (authStatus !== 'authenticated') return <Shell><p style={{ color: MUTED, fontSize: 14 }}>Please sign in.</p></Shell>

  return (
    <Shell>
      <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui, sans-serif", fontSize: 34, fontWeight: 500, margin: '0 0 6px', lineHeight: 1.15 }}>Orders</h1>
      <p style={{ color: MUTED, fontSize: 13.5, margin: '0 0 32px', lineHeight: 1.5 }}>
        Prints sell and ship automatically. This is a record of your sales.
      </p>

      {error && <p style={{ color: '#b03030', fontSize: 13.5 }}>{error}</p>}
      {!orders && !error && <p style={{ color: MUTED, fontSize: 13.5 }}>Loading orders…</p>}
      {orders && orders.length === 0 && <p style={{ color: MUTED, fontSize: 13.5 }}>No orders yet.</p>}

      {orders && orders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${HAIRLINE}` }}>
              <th style={th}>Date</th>
              <th style={th}>Print</th>
              <th style={th}>Buyer</th>
              <th style={th}>Status</th>
              <th style={th}>Profit</th>
              <th style={th}>Tracking</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const t = o.fulfillment?.tracking
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${HAIRLINE_SOFT}` }}>
                  <td style={td}>{(o.createdAt || '').slice(0, 10)}</td>
                  <td style={td}>{o.spec?.size} {o.spec?.finish}{o.spec?.frame && o.spec.frame !== 'none' ? `, ${o.spec.frame}` : ''}</td>
                  <td style={td}>{o.buyer?.name || o.buyer?.email || '—'}</td>
                  <td style={td}>{STATUS_LABEL[o.status] || o.status}</td>
                  <td style={{ ...td, color: INK }}>{money(o.amounts?.profit, o.amounts?.currency)}</td>
                  <td style={td}>{t?.url ? <a href={t.url} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>{t.number || 'Track'}</a> : t?.number || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Shell>
  )
}
