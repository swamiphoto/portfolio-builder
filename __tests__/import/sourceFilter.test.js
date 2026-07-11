import { sourceCounts, sourceLabel, matchesSource } from '@/common/import/sourceFilter'

const assets = [
  { source: { provider: 'manual' } },
  {},
  { source: { provider: 'smugmug' } },
  { source: { provider: 'generic' } },
  { source: { provider: 'generic' } },
]

describe('sourceCounts', () => {
  it('counts by provider, defaulting missing to manual', () => {
    expect(sourceCounts(assets)).toEqual({ manual: 2, smugmug: 1, generic: 2 })
  })
})
describe('sourceLabel', () => {
  it('maps known providers to friendly labels', () => {
    expect(sourceLabel('manual')).toBe('Uploaded')
    expect(sourceLabel('smugmug')).toBe('SmugMug')
    expect(sourceLabel('generic')).toBe('Website')
    expect(sourceLabel('flickr')).toBe('Flickr')
  })
})
describe('matchesSource', () => {
  it('all matches everything; otherwise matches provider', () => {
    expect(matchesSource({ source: { provider: 'smugmug' } }, 'all')).toBe(true)
    expect(matchesSource({ source: { provider: 'smugmug' } }, 'smugmug')).toBe(true)
    expect(matchesSource({}, 'manual')).toBe(true)
    expect(matchesSource({ source: { provider: 'generic' } }, 'smugmug')).toBe(false)
  })
})
