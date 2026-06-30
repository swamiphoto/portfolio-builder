/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/status'

jest.mock('../../common/vercel', () => ({ getDomain: jest.fn(), getDomainConfig: jest.fn() }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), writeSiteConfig: jest.fn() }))
import { getDomain, getDomainConfig } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1' }
beforeEach(() => jest.clearAllMocks())

it('returns null when no custom domain is set', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: null, pages: [] })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.body).toEqual({ customDomain: null })
})

it('flips a pending domain to active and stamps verifiedAt', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'pending', verifiedAt: null }, pages: [] })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.body.customDomain.status).toBe('active')
  expect(res.body.customDomain.verifiedAt).toBeTruthy()
  expect(writeSiteConfig).toHaveBeenCalled()
})

it('returns last-known status when Vercel errors', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'pending' }, pages: [] })
  getDomain.mockRejectedValue(new Error('vercel down'))
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain.status).toBe('pending')
})
