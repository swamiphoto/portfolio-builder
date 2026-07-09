import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

function money(cents, currency = 'USD') {
  if (typeof cents !== 'number') return '—'
  const v = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${v}` : `${v} ${currency}`
}

const STATUS_LABEL = {
  pending: 'Pending', paid: 'Paid', placed: 'In production',
  shipped: 'Shipped', fulfillment_failed: 'Needs attention', canceled: 'Canceled',
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

  if (authStatus === 'loading') return <main style={{ padding: 32 }}>Loading…</main>
  if (authStatus !== 'authenticated') return <main style={{ padding: 32 }}>Please sign in.</main>

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, sans-serif', color: '#1a1410' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Orders</h1>
      <p style={{ color: '#7a6f5f', fontSize: 14, marginTop: 0 }}>Prints sell and ship automatically. This is a record of your sales.</p>
      {error && <p style={{ color: '#b00' }}>{error}</p>}
      {!orders && !error && <p>Loading orders…</p>}
      {orders && orders.length === 0 && <p style={{ color: '#7a6f5f' }}>No orders yet.</p>}
      {orders && orders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e0d8cc', color: '#7a6f5f' }}>
              <th style={{ padding: '8px 6px' }}>Date</th>
              <th style={{ padding: '8px 6px' }}>Print</th>
              <th style={{ padding: '8px 6px' }}>Buyer</th>
              <th style={{ padding: '8px 6px' }}>Status</th>
              <th style={{ padding: '8px 6px' }}>Profit</th>
              <th style={{ padding: '8px 6px' }}>Tracking</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const t = o.fulfillment?.tracking
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0ebe2' }}>
                  <td style={{ padding: '8px 6px' }}>{(o.createdAt || '').slice(0, 10)}</td>
                  <td style={{ padding: '8px 6px' }}>{o.spec?.size} {o.spec?.finish}{o.spec?.frame && o.spec.frame !== 'none' ? `, ${o.spec.frame}` : ''}</td>
                  <td style={{ padding: '8px 6px' }}>{o.buyer?.name || o.buyer?.email || '—'}</td>
                  <td style={{ padding: '8px 6px' }}>{STATUS_LABEL[o.status] || o.status}</td>
                  <td style={{ padding: '8px 6px' }}>{money(o.amounts?.profit, o.amounts?.currency)}</td>
                  <td style={{ padding: '8px 6px' }}>{t?.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.number || 'Track'}</a> : t?.number || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
