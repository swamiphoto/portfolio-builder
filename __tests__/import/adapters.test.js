/**
 * @jest-environment node
 */
import { detectAdapter, getAdapter, PROVIDERS } from '@/common/import/adapters'

describe('adapter registry', () => {
  const ORIGINAL_KEY = process.env.SMUGMUG_API_KEY

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.SMUGMUG_API_KEY
    else process.env.SMUGMUG_API_KEY = ORIGINAL_KEY
  })

  it('routes smugmug domains to the smugmug API adapter when a key is configured', () => {
    process.env.SMUGMUG_API_KEY = 'test-key'
    expect(detectAdapter('https://joesmith.smugmug.com/Travel').id).toBe(PROVIDERS.SMUGMUG)
  })
  it('routes smugmug domains to the generic adapter when no key is configured (smugmugWeb picks it up from there — see discover.route.test.js)', () => {
    delete process.env.SMUGMUG_API_KEY
    expect(detectAdapter('https://joesmith.smugmug.com/Travel').id).toBe(PROVIDERS.GENERIC)
  })
  it('routes any other site to the generic adapter', () => {
    expect(detectAdapter('https://joesmith.com/portfolio').id).toBe(PROVIDERS.GENERIC)
    expect(detectAdapter('joesmith.squarespace.com').id).toBe(PROVIDERS.GENERIC)
  })
  it('returns null for empty input', () => {
    expect(detectAdapter('')).toBeNull()
    expect(detectAdapter('   ')).toBeNull()
  })
  it('never routes to a disabled adapter (instagram not present)', () => {
    expect(getAdapter('instagram')?.enabled).not.toBe(true)
  })
})
