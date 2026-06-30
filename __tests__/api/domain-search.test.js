/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/search'

jest.mock('../../common/vercel', () => ({ checkAvailability: jest.fn(), getPrice: jest.fn() }))
import { checkAvailability, getPrice } from '../../common/vercel'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
beforeEach(() => {
  jest.clearAllMocks()
  process.env.REGISTRAR_SEARCH_URL = 'https://reg.example/?domain='
})

it('expands a bare query across TLDs and prices only available ones', async () => {
  checkAvailability.mockImplementation((d) => Promise.resolve(d === 'janedoe.photo'))
  getPrice.mockResolvedValue({ price: 25, period: 1 })
  const res = mockRes()
  await handler({ query: { q: 'janedoe' } }, res)

  const byDomain = Object.fromEntries(res.body.results.map((r) => [r.domain, r]))
  expect(byDomain['janedoe.com']).toMatchObject({ available: false, price: null })
  expect(byDomain['janedoe.photo']).toMatchObject({ available: true, price: 25 })
  expect(byDomain['janedoe.photo'].registrarUrl).toBe('https://reg.example/?domain=janedoe.photo')
})

it('includes an explicit TLD from the query', async () => {
  checkAvailability.mockResolvedValue(false)
  const res = mockRes()
  await handler({ query: { q: 'janedoe.studio' } }, res)
  expect(res.body.results.some((r) => r.domain === 'janedoe.studio')).toBe(true)
})

it('returns an empty result set for a blank query', async () => {
  const res = mockRes()
  await handler({ query: { q: '' } }, res)
  expect(res.body.results).toEqual([])
})
