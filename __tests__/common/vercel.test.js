/** @jest-environment node */
import { addDomain, checkAvailability, getPrice, removeDomain } from '../../common/vercel'

const OLD_ENV = process.env
beforeEach(() => {
  process.env = { ...OLD_ENV, VERCEL_API_TOKEN: 'tok', VERCEL_PROJECT_ID: 'proj', VERCEL_TEAM_ID: 'team' }
  global.fetch = jest.fn()
})
afterEach(() => { process.env = OLD_ENV; jest.resetAllMocks() })

function ok(body) { return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }) }

describe('addDomain', () => {
  it('POSTs to the project domains endpoint with the team query and bearer token', async () => {
    global.fetch.mockReturnValue(ok({ name: 'a.com', verified: true, verification: [] }))
    const r = await addDomain('a.com')
    expect(r).toEqual({ name: 'a.com', verified: true, verification: [] })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.vercel.com/v10/projects/proj/domains?teamId=team')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(opts.body)).toEqual({ name: 'a.com' })
  })

  it('throws an error carrying status and code on failure', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false, status: 409, json: () => Promise.resolve({ error: { code: 'domain_already_in_use', message: 'taken' } }),
    }))
    await expect(addDomain('a.com')).rejects.toMatchObject({ status: 409, code: 'domain_already_in_use', message: 'taken' })
  })
})

describe('checkAvailability', () => {
  it('returns the boolean available flag', async () => {
    global.fetch.mockReturnValue(ok({ available: true }))
    await expect(checkAvailability('a.com')).resolves.toBe(true)
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.vercel.com/v1/registrar/domains/a.com/availability?teamId=team')
  })
})

describe('getPrice', () => {
  it('maps the registrar purchasePrice/years onto { price, period }', async () => {
    global.fetch.mockReturnValue(ok({ years: 1, purchasePrice: 20, renewalPrice: 20, transferPrice: 20 }))
    await expect(getPrice('a.com')).resolves.toEqual({ price: 20, period: 1 })
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.vercel.com/v1/registrar/domains/a.com/price?teamId=team')
  })
})

describe('removeDomain', () => {
  it('DELETEs the project domain', async () => {
    global.fetch.mockReturnValue(ok({}))
    await removeDomain('a.com')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.vercel.com/v9/projects/proj/domains/a.com?teamId=team')
    expect(opts.method).toBe('DELETE')
  })
})
