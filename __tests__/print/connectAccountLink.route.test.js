jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))

const mockRead = jest.fn()
const mockWrite = jest.fn()
jest.mock('@/common/siteConfig', () => ({
  readSiteConfig: (...a) => mockRead(...a),
  writeSiteConfig: (...a) => mockWrite(...a),
  createDefaultSiteConfig: (id) => ({ printStore: {} }),
  normalizePrintStore: (c) => ({ ...c, printStore: { ...(c.printStore || {}) } }),
}))

const mockAccountsCreate = jest.fn()
const mockLinksCreate = jest.fn()
jest.mock('@/common/stripe/client', () => ({
  getStripe: () => ({
    accounts: { create: (...a) => mockAccountsCreate(...a) },
    accountLinks: { create: (...a) => mockLinksCreate(...a) },
  }),
}))

import handler from '@/pages/api/admin/print/connect'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}
const req = { method: 'POST', headers: { origin: 'https://site.test' } }

function resourceMissing() {
  const e = new Error("No such account: 'acct_stale'")
  e.code = 'resource_missing'
  e.statusCode = 400
  return e
}

describe('POST /api/admin/print/connect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('recovers when the stored account id is no longer valid (test->live migration)', async () => {
    // Stored account id from a previous (now unusable) Stripe context.
    mockRead.mockResolvedValue({ printStore: { stripeConnectAccountId: 'acct_stale' } })
    // First link attempt fails because the stored account cannot be found...
    mockLinksCreate
      .mockRejectedValueOnce(resourceMissing())
      .mockResolvedValueOnce({ url: 'https://connect.stripe.com/setup/fresh' })
    // ...so the handler creates a fresh account and retries.
    mockAccountsCreate.mockResolvedValue({ id: 'acct_fresh' })

    const res = mockRes()
    await handler(req, res)

    expect(mockAccountsCreate).toHaveBeenCalledTimes(1) // recreated after the miss
    expect(mockWrite).toHaveBeenCalled() // persisted the new id
    expect(mockLinksCreate).toHaveBeenLastCalledWith(expect.objectContaining({ account: 'acct_fresh' }))
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ url: 'https://connect.stripe.com/setup/fresh' })
  })

  it('creates an account and returns the onboarding url on first connect', async () => {
    mockRead.mockResolvedValue({ printStore: {} })
    mockAccountsCreate.mockResolvedValue({ id: 'acct_new' })
    mockLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/setup/new' })

    const res = mockRes()
    await handler(req, res)

    expect(mockAccountsCreate).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ url: 'https://connect.stripe.com/setup/new' })
  })

  it('surfaces a 500 (not a silent success) when Stripe fails for a non-recoverable reason', async () => {
    mockRead.mockResolvedValue({ printStore: { stripeConnectAccountId: 'acct_ok' } })
    const boom = new Error('api down')
    boom.code = 'api_error'
    mockLinksCreate.mockRejectedValue(boom)

    const res = mockRes()
    await handler(req, res)

    expect(mockAccountsCreate).not.toHaveBeenCalled() // did NOT recreate on a non-missing error
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
