import { sourceCounts, sourceLabel, matchesSource } from '@/common/import/sourceFilter'

const assets = [
  { source: { provider: 'manual' } },
  {},
  { source: { provider: 'smugmug' } },
  { source: { provider: 'generic', label: 'swamifoto.com' } },
  { source: { provider: 'generic' } },
]

describe('sourceCounts', () => {
  it('counts by provider; web imports keyed by their site label (fallback "Website")', () => {
    expect(sourceCounts(assets)).toEqual({ manual: 2, smugmug: 1, 'swamifoto.com': 1, Website: 1 })
  })
})
describe('sourceLabel', () => {
  it('maps known providers to friendly labels; passes others through title-cased', () => {
    expect(sourceLabel('manual')).toBe('Uploaded')
    expect(sourceLabel('smugmug')).toBe('SmugMug')
    expect(sourceLabel('Website')).toBe('Website')
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
