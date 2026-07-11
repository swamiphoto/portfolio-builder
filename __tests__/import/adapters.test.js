/**
 * @jest-environment node
 */
import { detectAdapter, getAdapter, PROVIDERS } from '@/common/import/adapters'

describe('adapter registry', () => {
  it('routes smugmug domains to the smugmug adapter', () => {
    expect(detectAdapter('https://joesmith.smugmug.com/Travel').id).toBe(PROVIDERS.SMUGMUG)
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
