// Lifetime print earnings for the signed-in photographer: the sum of profit
// across all paid (non-pending, non-canceled) orders. Amounts are integer cents.
import { withAuth } from '../../../../common/withAuth'
import { listOrders } from '../../../../common/orders'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const orders = await listOrders(user.id)
    const counted = orders.filter(o => o.status && o.status !== 'pending' && o.status !== 'canceled')
    const total = counted.reduce((sum, o) => sum + (o.amounts?.profit || 0), 0)
    const currency = counted[0]?.amounts?.currency || 'USD'
    return res.status(200).json({ total, count: counted.length, currency })
  } catch (err) {
    console.error('print earnings error', err)
    return res.status(500).json({ error: 'Could not compute earnings' })
  }
}

export default withAuth(handler)
