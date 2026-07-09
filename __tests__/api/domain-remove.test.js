/** @jest-environment node */
import { handler } from '../../pages/api/admin/domain/index'

jest.mock('../../common/vercel', () => ({ removeDomain: jest.fn() }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), writeSiteConfig: jest.fn() }))
jest.mock('../../common/gcsClient', () => ({ deleteFile: jest.fn() }))
import { removeDomain } from '../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../common/siteConfig'
import { deleteFile } from '../../common/gcsClient'

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
const USER = { id: 'u1' }
beforeEach(() => jest.clearAllMocks())

it('removes from Vercel, deletes the pointer, and clears config', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: { name: 'a.com', status: 'active' }, pages: [] })
  const res = mockRes()
  await handler({ method: 'DELETE' }, res, USER)
  expect(removeDomain).toHaveBeenCalledWith('a.com')
  expect(deleteFile).toHaveBeenCalledWith('domains/a.com.json')
  expect(writeSiteConfig).toHaveBeenCalledWith('u1', expect.objectContaining({ customDomain: null }))
  expect(res.body).toEqual({ ok: true })
})

it('is a no-op success when no domain is set', async () => {
  readSiteConfig.mockResolvedValue({ userId: 'u1', customDomain: null, pages: [] })
  const res = mockRes()
  await handler({ method: 'DELETE' }, res, USER)
  expect(removeDomain).not.toHaveBeenCalled()
  expect(res.body).toEqual({ ok: true })
})
