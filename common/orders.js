// Server-side per-user order persistence in GCS.
import { randomUUID } from 'crypto'
import { downloadJSON, uploadJSON, listFiles } from './gcsClient'
import { getUserOrdersPrefix, getUserOrderPath } from './gcsUser'

export function newOrderId() {
  return `ord_${randomUUID()}`
}

export async function saveOrder(userId, order) {
  await uploadJSON(getUserOrderPath(userId, order.id), order)
  return order
}

export async function getOrder(userId, orderId) {
  try {
    return await downloadJSON(getUserOrderPath(userId, orderId))
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') return null
    throw err
  }
}

export async function listOrders(userId) {
  const keys = await listFiles(getUserOrdersPrefix(userId))
  const jsonKeys = keys.filter((k) => k.endsWith('.json'))
  const orders = await Promise.all(jsonKeys.map((k) => downloadJSON(k).catch(() => null)))
  return orders.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
