// __tests__/client-engagement/engagement.route.test.js
const mockLookup = jest.fn()
jest.mock('@/common/userProfile', () => ({ lookupUserByUsername: (...a) => mockLookup(...a) }))

const mockReadSiteConfig = jest.fn()
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: (...a) => mockReadSiteConfig(...a) }))

const mockRead = jest.fn()
const mockWrite = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/clientEngagement', () => {
  const actual = jest.requireActual('@/common/clientEngagement')
  return { ...actual, readEngagement: (...a) => mockRead(...a), writeEngagement: (...a) => mockWrite(...a) }
})

const mockSendMail = jest.fn().mockResolvedValue({ sent: true })
jest.mock('@/common/email/mailer', () => ({ sendMail: (...a) => mockSendMail(...a) }))

import handler from '@/pages/api/client/engagement'
import { emptyEngagement } from '@/common/clientEngagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

const CF = { enabled: true, favorites: { enabled: true, requireEmail: false, submitWorkflow: true }, comments: { enabled: true, requireEmail: false } }

function siteWith(cf) {
  return { contact: { email: 'photog@x.com' }, pages: [{ id: 'p1', slug: 'wedding', title: 'Wedding', clientFeatures: cf }] }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLookup.mockResolvedValue({ userId: 'u1' })
  mockReadSiteConfig.mockResolvedValue(siteWith(CF))
  mockRead.mockResolvedValue(emptyEngagement())
})

describe('GET /api/client/engagement', () => {
  it('404s unknown username', async () => {
    mockLookup.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'nope', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('404s when client features are disabled', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, enabled: false }))
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns engagement with emails stripped', async () => {
    mockRead.mockResolvedValue({
      people: { d1: { name: 'Priya', email: 'secret@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 1 }],
      comments: [], submissions: [],
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.people.d1).toEqual({ name: 'Priya' })
    expect(JSON.stringify(body)).not.toContain('secret@x.com')
    expect(body.favorites).toHaveLength(1)
  })

  it('resolves page by slug too', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'wedding' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

describe('POST /api/client/engagement', () => {
  it('favorites a photo and persists', async () => {
    // Email is always required for favorites; pre-populate the person record with an email.
    mockRead.mockResolvedValue({ ...emptyEngagement(), people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } } })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'favorite', photoUrl: 'https://cdn/a.jpg' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockWrite).toHaveBeenCalledWith('u1', 'p1', expect.objectContaining({
      favorites: [expect.objectContaining({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1' })],
    }))
  })

  it('rejects comment when comments disabled', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, comments: { enabled: false } }))
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'comment', photoUrl: 'x', text: 'hi' } }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('enforces requireEmail on favorite', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, favorites: { ...CF.favorites, requireEmail: true } }))
    mockRead.mockResolvedValue({ ...emptyEngagement(), people: { d1: { name: 'P', email: '', firstSeen: 1 } } })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'favorite', photoUrl: 'https://cdn/a.jpg' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].error).toBe('email required')
  })

  it('enforces requireEmail on comment', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, comments: { enabled: true, requireEmail: true } }))
    mockRead.mockResolvedValue({ ...emptyEngagement(), people: { d1: { name: 'P', email: '', firstSeen: 1 } } })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'comment', photoUrl: 'x', text: 'hi' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].error).toBe('email required')
  })

  it('submit emails the photographer with the selection', async () => {
    mockRead.mockResolvedValue({
      ...emptyEngagement(),
      people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 1 }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'submit' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'photog@x.com' }))
    expect(mockSendMail.mock.calls[0][0].subject).toContain('Priya')
    expect(mockSendMail.mock.calls[0][0].subject).toContain('1')
  })

  it('allows submit whenever favorites is enabled (submitWorkflow flag removed)', async () => {
    // submitWorkflow is no longer a separate toggle; submit is allowed when favorites.enabled is true.
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, favorites: { enabled: true } }))
    mockRead.mockResolvedValue({ ...emptyEngagement(), people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } } })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'submit' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('propagates reducer validation as 400', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'comment', photoUrl: 'x', text: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('405s other methods', async () => {
    const res = mockRes()
    await handler({ method: 'DELETE', query: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
