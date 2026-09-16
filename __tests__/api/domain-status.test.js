/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/status'

jest.mock('../../common/vercel', () => ({ getDomain: jest.fn(), getDomainConfig: jest.fn(), addWwwRedirect: jest.fn() }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), writeSiteConfig: jest.fn() }))
import { getDomain, getDomainConfig, addWwwRedirect } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1' }
beforeEach(() => { jest.clearAllMocks(); addWwwRedirect.mockResolvedValue(true) })

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

it('backfills the www redirect for a legacy apex and adds the www CNAME once', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', pages: [], customDomain: {
    name: 'a.com', status: 'active', verifiedAt: '2026-01-01T00:00:00Z',
    verification: [{ type: 'A', name: '@', value: '76.76.21.21' }],
  } })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(addWwwRedirect).toHaveBeenCalledWith('a.com')
  expect(res.body.customDomain.wwwAddedAt).toBeTruthy()
  expect(res.body.customDomain.verification).toEqual([
    { type: 'A', name: '@', value: '76.76.21.21' },
    { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' },
  ])
})

it('does not re-add the www redirect once wwwAddedAt is set', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', pages: [], customDomain: {
    name: 'a.com', status: 'active', wwwAddedAt: '2026-02-02T00:00:00Z',
  } })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(addWwwRedirect).not.toHaveBeenCalled()
})

it('sets wwwStatus to pending when the www redirect is misconfigured', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', pages: [], customDomain: {
    name: 'a.com', status: 'active', wwwAddedAt: '2026-02-02T00:00:00Z',
  } })
  // Apex resolves; www does not yet.
  getDomain.mockImplementation((n) => Promise.resolve({ verified: !n.startsWith('www.') }))
  getDomainConfig.mockImplementation((n) => Promise.resolve({ misconfigured: n.startsWith('www.') }))
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(getDomain).toHaveBeenCalledWith('www.a.com')
  expect(res.body.customDomain.status).toBe('active')
  expect(res.body.customDomain.wwwStatus).toBe('pending')
})

it('marks wwwStatus active and stops re-checking once www resolves', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', pages: [], customDomain: {
    name: 'a.com', status: 'active', wwwAddedAt: '2026-02-02T00:00:00Z', wwwStatus: 'active',
  } })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  // Only the apex is queried — www is not re-checked once it's active.
  expect(getDomain).toHaveBeenCalledTimes(1)
  expect(getDomain).toHaveBeenCalledWith('a.com')
  expect(res.body.customDomain.wwwStatus).toBe('active')
})

it('does not attempt a www redirect for a subdomain', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', pages: [], customDomain: {
    name: 'photos.a.com', status: 'active',
  } })
  getDomain.mockResolvedValue({ verified: true })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(addWwwRedirect).not.toHaveBeenCalled()
})

it('returns last-known status when Vercel errors', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'pending' }, pages: [] })
  getDomain.mockRejectedValue(new Error('vercel down'))
  const res = mockRes()
  await handler({ method: 'GET' }, res, USER)
  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain.status).toBe('pending')
})
