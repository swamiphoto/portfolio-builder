// __tests__/api/print-settings.test.js
import handler from '../../pages/api/admin/print/settings'

jest.mock('../../common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

jest.mock('../../common/siteConfig', () => {
  const actual = jest.requireActual('../../common/siteConfig')
  return {
    ...actual,
    readSiteConfig: jest.fn(),
    writeSiteConfig: jest.fn(),
  }
})

import { readSiteConfig, writeSiteConfig, createDefaultSiteConfig } from '../../common/siteConfig'

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
  }
}

describe('PUT /api/admin/print/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    readSiteConfig.mockResolvedValue(createDefaultSiteConfig('u1'))
    writeSiteConfig.mockResolvedValue()
  })

  it('rejects a non-positive markup', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', body: { markup: 0 } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('saves enabled + markup and returns printStore', async () => {
    const res = mockRes()
    await handler({ method: 'PUT', body: { enabled: true, markup: 2.5 } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.printStore.enabled).toBe(true)
    expect(res.body.printStore.markup).toBe(2.5)
    expect(writeSiteConfig).toHaveBeenCalled()
  })
})
