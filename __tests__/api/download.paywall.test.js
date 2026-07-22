// __tests__/api/download.paywall.test.js
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn() }))
jest.mock('../../common/clientEngagement', () => ({
  readEngagement: jest.fn(),
  writeEngagement: jest.fn(async () => {}),
  applyEngagementAction: jest.fn((d) => d),
}))
jest.mock('../../common/adminConfig', () => ({ readLibraryConfig: jest.fn(async () => ({ assets: {} })) }))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (u) => u }))

import { readSiteConfig } from '../../common/siteConfig'
import { readEngagement } from '../../common/clientEngagement'
import handler from '../../pages/api/client/download'

const PHOTO = 'https://cdn.example.com/photos/new.jpg'
function res() {
  return { statusCode: 200, body: null, headers: {}, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this}, setHeader(k,v){this.headers[k]=v}, send(b){this.body=b;return this} }
}
function req() {
  return { method: 'GET', query: { username: 'ada', pageId: 'p1', photoUrl: PHOTO, quality: 'display', deviceId: 'd1' } }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
})

it('returns 402 for a new photo past the ceiling when purchase is enabled', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 0, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({ people: { d1: { name: 'Mia', email: 'mia@x.com' } }, downloads: [], entitlements: {} })
  const r = res()
  await handler(req(), r)
  expect(r.statusCode).toBe(402)
})

it('serves a re-download of an already-unlocked photo even past the ceiling', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 0, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({
    people: { d1: { name: 'Mia', email: 'mia@x.com' } },
    downloads: [{ photoUrl: PHOTO, deviceId: 'd1', quality: 'display', ts: 1 }],
    entitlements: {},
  })
  global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new ArrayBuffer(3) }))
  const r = res()
  await handler(req(), r)
  expect(r.statusCode).toBe(200)
})
