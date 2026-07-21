jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn() }))
const readEngagement = jest.fn()
jest.mock('../../common/clientEngagement', () => ({
  readEngagement: (...a) => readEngagement(...a),
  writeEngagement: jest.fn(),
  applyEngagementAction: jest.fn(),
}))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn() }))

import { readSiteConfig } from '../../common/siteConfig'
import handler from '../../pages/api/client/engagement'

function res() { return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} } }

it('returns the viewer purchase state and never leaks emails', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 2, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({
    people: { d1: { name: 'Mia', email: 'mia@x.com' } },
    favorites: [], comments: [], submissions: [],
    downloads: [{ photoUrl: 'a.jpg', deviceId: 'd1', quality: 'display', ts: 1 }],
    entitlements: { 'mia@x.com': { credits: 3, all: false, orders: ['o1'], updatedAt: 1 } },
  })
  const r = res()
  await handler({ method: 'GET', query: { username: 'ada', pageId: 'p1', deviceId: 'd1' } }, r)
  expect(r.statusCode).toBe(200)
  expect(r.body.purchase).toMatchObject({ unlockedCount: 1, ceiling: 5, all: false, remaining: 4, freeAllowance: 2 })
  expect(r.body.purchase.unlockedUrls).toEqual(['a.jpg'])
  // no email anywhere in the people payload
  expect(JSON.stringify(r.body.people)).not.toContain('mia@x.com')
})

it('omits purchase state when the feature is off', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: { enabled: true, favorites: { enabled: true } } }] })
  readEngagement.mockResolvedValue({ people: {}, favorites: [], comments: [], submissions: [], downloads: [], entitlements: {} })
  const r = res()
  await handler({ method: 'GET', query: { username: 'ada', pageId: 'p1', deviceId: 'd1' } }, r)
  expect(r.body.purchase).toBeUndefined()
})
