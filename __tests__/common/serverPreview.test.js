/** @jest-environment node */
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
jest.mock('../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), readPublishedSiteConfig: jest.fn() }))

import { getServerSession } from 'next-auth/next'
import { readSiteConfig, readPublishedSiteConfig } from '../../common/siteConfig'
import { resolvePublicSiteConfig } from '../../common/serverPreview'

function mockRes() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v } }
}
const OWNER = 'u1'
beforeEach(() => {
  jest.clearAllMocks()
  readSiteConfig.mockResolvedValue({ draft: true })
  readPublishedSiteConfig.mockResolvedValue({ published: true })
  getServerSession.mockResolvedValue({ user: { id: OWNER } })
})

it('serves the draft and sets the preview cookie when the owner opens ?preview=1', async () => {
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: {} }, res, query: { preview: '1' }, ownerUserId: OWNER })
  expect(out).toEqual({ siteConfig: { draft: true }, isPreview: true })
  expect(res.headers['Set-Cookie']).toMatch(/sepia_preview=1/)
  expect(res.headers['Cache-Control']).toMatch(/no-store/)
})

it('persists preview across navigation via the cookie (no ?preview needed)', async () => {
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: { sepia_preview: '1' } }, res, query: {}, ownerUserId: OWNER })
  expect(out.isPreview).toBe(true)
  expect(out.siteConfig).toEqual({ draft: true })
  expect(res.headers['Set-Cookie']).toMatch(/sepia_preview=1/)
})

it('exits preview on ?preview=0 — clears the cookie and serves published', async () => {
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: { sepia_preview: '1' } }, res, query: { preview: '0' }, ownerUserId: OWNER })
  expect(out).toEqual({ siteConfig: { published: true }, isPreview: false })
  expect(res.headers['Set-Cookie']).toMatch(/sepia_preview=;/)
  expect(res.headers['Set-Cookie']).toMatch(/Max-Age=0/)
  expect(getServerSession).not.toHaveBeenCalled()
})

it('never serves the draft to a non-owner, even with ?preview=1', async () => {
  getServerSession.mockResolvedValue({ user: { id: 'someone-else' } })
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: {} }, res, query: { preview: '1' }, ownerUserId: OWNER })
  expect(out).toEqual({ siteConfig: { published: true }, isPreview: false })
  expect(res.headers['Set-Cookie']).toBeUndefined()
})

it('clears a leftover cookie the owner session cannot honor', async () => {
  getServerSession.mockResolvedValue(null)
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: { sepia_preview: '1' } }, res, query: {}, ownerUserId: OWNER })
  expect(out.isPreview).toBe(false)
  expect(res.headers['Set-Cookie']).toMatch(/sepia_preview=;/)
})

it('serves published with no cookie churn for a normal visitor', async () => {
  const res = mockRes()
  const out = await resolvePublicSiteConfig({ req: { cookies: {} }, res, query: {}, ownerUserId: OWNER })
  expect(out).toEqual({ siteConfig: { published: true }, isPreview: false })
  expect(res.headers['Set-Cookie']).toBeUndefined()
  expect(getServerSession).not.toHaveBeenCalled()
})
