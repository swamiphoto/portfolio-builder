import { publicPrintStore } from '@/common/print/publicPrint'

it('paymentsReady is true only when charges are enabled with a connected account', () => {
  expect(publicPrintStore({ printStore: { chargesEnabled: true, stripeConnectAccountId: 'acct_1' } }).paymentsReady).toBe(true)
  expect(publicPrintStore({ printStore: { chargesEnabled: false, stripeConnectAccountId: 'acct_1' } }).paymentsReady).toBe(false)
  expect(publicPrintStore({ printStore: { chargesEnabled: true } }).paymentsReady).toBe(false)
})

it('never leaks the connected account id', () => {
  const out = publicPrintStore({ printStore: { chargesEnabled: true, stripeConnectAccountId: 'acct_secret' } })
  expect(JSON.stringify(out)).not.toContain('acct_secret')
})
