/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/connect'

jest.mock('../../common/vercel', () => ({
  addDomain: jest.fn(),
  getDomain: jest.fn(),
  getDomainConfig: jest.fn(),
}))
jest.mock('../../common/siteConfig', () => ({
  readSiteConfig: jest.fn(),
  writeSiteConfig: jest.fn(),
}))
jest.mock('../../common/gcsClient', () => ({ uploadJSON: jest.fn() }))

import { addDomain, getDomain, getDomainConfig } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'
import { uploadJSON } from '../../common/gcsClient'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1', email: 'a@b.c', username: 'jane' }

beforeEach(() => {
  jest.clearAllMocks()
  readSiteConfig.mockResolvedValue({ userId: 'u1', slug: 'jane', pages: [] })
})

it('rejects an invalid domain with 400', async () => {
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'not a domain' } }, res, USER)
  expect(res.statusCode).toBe(400)
})

it('connects a subdomain: stores pending config + writes the pointer', async () => {
  addDomain.mockResolvedValue({ name: 'photos.janedoe.com', verified: true, verification: [] })
  getDomainConfig.mockResolvedValue({ misconfigured: true })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'photos.janedoe.com' } }, res, USER)

  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain).toMatchObject({
    name: 'photos.janedoe.com', status: 'pending',
    verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
  })
  expect(writeSiteConfig).toHaveBeenCalledWith('u1', expect.objectContaining({
    customDomain: expect.objectContaining({ name: 'photos.janedoe.com', status: 'pending' }),
  }))
  expect(uploadJSON).toHaveBeenCalledWith('domains/photos.janedoe.com.json', { username: 'jane', userId: 'u1' })
})

it('marks active when verified and not misconfigured', async () => {
  addDomain.mockResolvedValue({ name: 'janedoe.com', verified: true, verification: [] })
  getDomainConfig.mockResolvedValue({ misconfigured: false })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'janedoe.com' } }, res, USER)
  expect(res.body.customDomain.status).toBe('active')
  expect(res.body.customDomain.verifiedAt).toBeTruthy()
})

it('maps an already-in-use conflict to 409 when domain belongs to another project', async () => {
  const err = new Error('taken'); err.status = 409; err.code = 'domain_already_in_use'
  addDomain.mockRejectedValue(err)
  const notFound = new Error('not found'); notFound.status = 404
  getDomain.mockRejectedValue(notFound)
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'taken.com' } }, res, USER)
  expect(res.statusCode).toBe(409)
})

it('idempotent reconnect: addDomain 409 but getDomain resolves → 200', async () => {
  const err = new Error('conflict'); err.status = 409; err.code = 'domain_already_in_use'
  addDomain.mockRejectedValue(err)
  getDomain.mockResolvedValue({ name: 'photos.janedoe.com', verified: false, verification: [] })
  getDomainConfig.mockResolvedValue({ misconfigured: true })
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'photos.janedoe.com' } }, res, USER)

  expect(res.statusCode).toBe(200)
  expect(res.body.customDomain).toMatchObject({ name: 'photos.janedoe.com', status: 'pending' })
  expect(writeSiteConfig).toHaveBeenCalledWith('u1', expect.objectContaining({
    customDomain: expect.objectContaining({ name: 'photos.janedoe.com', status: 'pending' }),
  }))
  expect(uploadJSON).toHaveBeenCalledWith('domains/photos.janedoe.com.json', { username: 'jane', userId: 'u1' })
})

it('400s when the user has no username yet', async () => {
  const res = mockRes()
  await handler({ method: 'POST', body: { name: 'janedoe.com' } }, res, { id: 'u1', email: 'a@b.c' })
  expect(res.statusCode).toBe(400)
})
