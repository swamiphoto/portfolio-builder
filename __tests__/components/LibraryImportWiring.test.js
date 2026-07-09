import { applyImportToConfig } from '@/common/import/importClient'

// Focused wiring/logic test: the merge that handleImportComplete performs.
describe('handleImportComplete merge', () => {
  it('adds imported assets and a gallery per collection to the config', () => {
    const config = { portfolios: {}, galleries: {}, assets: {} }
    const summary = {
      imported: [
        { assetId: 'a1', publicUrl: 'https://cdn/1.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
        { assetId: 'a2', publicUrl: 'https://cdn/2.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
      ],
      collections: [{ id: 'c1', name: 'Travel' }],
    }
    const next = applyImportToConfig(config, summary)
    expect(next.assets.a1.source.provider).toBe('generic')
    expect(next.galleries.travel).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg'])
  })
})
