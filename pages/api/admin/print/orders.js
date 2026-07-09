import { withAuth } from '../../../../common/withAuth'
import { listOrders } from '../../../../common/orders'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const orders = await listOrders(user.id)
    return res.status(200).json({ orders })
  } catch (err) {
    console.error('list orders error', err)
    return res.status(500).json({ error: 'Could not load orders' })
  }
}

export default withAuth(handler)
