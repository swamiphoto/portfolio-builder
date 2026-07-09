// __tests__/common/prodigiClient.test.js
import { prodigiFetch, prodigiBaseUrl } from '../../common/fulfillment/prodigiClient'

describe('prodigiClient', () => {
  const OLD = process.env
  beforeEach(() => { process.env = { ...OLD, PRODIGI_API_KEY: 'test-key' } })
  afterEach(() => { process.env = OLD; jest.restoreAllMocks() })

  it('defaults to the sandbox base URL', () => {
    expect(prodigiBaseUrl()).toBe('https://api.sandbox.prodigi.com')
  })

  it('uses the live base URL when PRODIGI_ENV=live', () => {
    process.env.PRODIGI_ENV = 'live'
    expect(prodigiBaseUrl()).toBe('https://api.prodigi.com')
  })

  it('sends the API key header and parses JSON on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ order: { id: 'ord_1' } }),
    })
    global.fetch = fetchMock
    const out = await prodigiFetch('/v4.0/Orders', { method: 'POST', body: { a: 1 } })
    expect(out).toEqual({ order: { id: 'ord_1' } })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.sandbox.prodigi.com/v4.0/Orders')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('test-key')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ a: 1 })
  })

  it('throws with status and body on non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 422, text: async () => 'bad sku',
    })
    await expect(prodigiFetch('/v4.0/Orders', { method: 'POST', body: {} }))
      .rejects.toThrow(/prodigi 422: bad sku/)
  })

  it('throws when the API key is missing', async () => {
    delete process.env.PRODIGI_API_KEY
    await expect(prodigiFetch('/v4.0/Orders')).rejects.toThrow(/PRODIGI_API_KEY not configured/)
  })

  it('does not set Content-Type on a bodyless GET', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    global.fetch = fetchMock
    await prodigiFetch('/v4.0/Orders/ord_1')
    const opts = fetchMock.mock.calls[0][1]
    expect(opts.headers['X-API-Key']).toBe('test-key')
    expect(opts.headers['Content-Type']).toBeUndefined()
  })
})
