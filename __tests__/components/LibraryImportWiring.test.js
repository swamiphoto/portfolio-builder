import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { applyImportToConfig } from '@/common/import/importClient'
import AdminLibrary from '@/components/admin/AdminLibrary'

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

// Mock the (heavy, multi-step) import flow with a one-click stand-in so we can
// drive AdminLibrary's real handleImportComplete/currentConfig/saveConfig path.
jest.mock('@/components/admin/import/ImportFlow', () => {
  return function MockImportFlow({ onComplete }) {
    return (
      <button
        onClick={() => onComplete({
          imported: [{ assetId: 'new1', publicUrl: 'https://cdn/new1.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } }],
          collections: [{ id: 'c1', name: 'Travel' }],
          importBatchId: 'batch1',
        })}
      >
        Mock complete import
      </button>
    )
  }
})

// Critical regression: currentConfig() must echo every field the server-side
// merge (pages/api/admin/library.js mergeIncomingConfig) would otherwise take
// from the incoming body — most importantly `sets` — or a PUT triggered by
// import silently wipes any pre-existing curated Sets.
describe('AdminLibrary import PUT preserves existing library state', () => {
  afterEach(() => jest.resetAllMocks())

  it('keeps a pre-existing set alongside the newly created import set in the PUT body', async () => {
    const libraryGet = {
      images: [],
      allImages: [],
      portfolios: {},
      galleries: {},
      assets: {},
      assetOrder: [],
      sets: {
        'set-existing': { setId: 'set-existing', name: 'Existing set', kind: 'manual', assetIds: ['a0'], rule: null, createdAt: 't', updatedAt: 't' },
      },
      savedViews: {},
      counts: {},
    }

    let putBody = null
    global.fetch = jest.fn((url, opts) => {
      const u = String(url)
      if (u.includes('/api/admin/library') && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(libraryGet) })
      }
      if (u.includes('/api/admin/library') && opts?.method === 'PUT') {
        putBody = JSON.parse(opts.body)
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
      }
      if (u.includes('/api/admin/print/settings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<AdminLibrary onBack={() => {}} siteConfig={{ pages: [] }} />)

    fireEvent.click(await screen.findByText(/import from your other sites/i))
    fireEvent.click(await screen.findByText(/mock complete import/i))

    await waitFor(() => expect(putBody).not.toBeNull())
    expect(putBody.sets['set-existing']).toMatchObject({ name: 'Existing set', assetIds: ['a0'] })
    const newSet = Object.values(putBody.sets).find((s) => s.name === 'Travel')
    expect(newSet).toBeTruthy()
    expect(newSet.assetIds).toEqual(['new1'])

    // Let the post-save quiet refetch (triggered inside saveConfig) settle so no
    // state update lands after the test body returns.
    await waitFor(() => {
      const libraryCalls = global.fetch.mock.calls.filter(([u]) => String(u).includes('/api/admin/library'))
      expect(libraryCalls.length).toBeGreaterThanOrEqual(3)
    })
  })
})
