import { applyImportToConfig } from '@/common/import/importClient'

// Focused wiring/logic test: the merge that handleImportComplete performs.
describe('handleImportComplete merge', () => {
  it('adds imported assets and groups them into a library set per collection', () => {
    const config = { portfolios: {}, galleries: {}, assets: {}, sets: {} }
    const summary = {
      imported: [
        { assetId: 'a1', publicUrl: 'https://cdn/1.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
        { assetId: 'a2', publicUrl: 'https://cdn/2.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
      ],
      collections: [{ id: 'c1', name: 'Travel' }],
    }
    const next = applyImportToConfig(config, summary)
    expect(next.assets.a1.source.provider).toBe('generic')
    const sets = Object.values(next.sets)
    expect(sets).toHaveLength(1)
    expect(sets[0]).toMatchObject({ name: 'Travel', kind: 'manual', assetIds: ['a1', 'a2'] })
  })
})
