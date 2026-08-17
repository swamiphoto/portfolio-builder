import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { applyImportToConfig } from '@/common/import/importClient'
import AdminLibrary from '@/components/admin/AdminLibrary'
import MockImportFlow from '@/components/admin/import/ImportFlow'

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
// The summary it fires is settable per-test via __setSummary so different tests
// can exercise the photo-only vs. replicate-pages branches.
jest.mock('@/components/admin/import/ImportFlow', () => {
  let nextSummary = {
    imported: [{ assetId: 'new1', publicUrl: 'https://cdn/new1.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } }],
    collections: [{ id: 'c1', name: 'Travel' }],
    importBatchId: 'batch1',
  }
  function MockImportFlow({ onComplete }) {
    return <button onClick={() => onComplete(nextSummary)}>Mock complete import</button>
  }
  MockImportFlow.__setSummary = (s) => { nextSummary = s }
  return MockImportFlow
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

// Critical regression 2: when a parent supplies onComposedPages, replicated
// pages must flow through it (the parent's own siteConfig state + autosave)
// rather than AdminLibrary issuing a raw site-config fetch/PUT against a
// snapshot that a stale parent could immediately clobber on its next autosave.
describe('AdminLibrary routes composed pages through the parent when provided', () => {
  afterEach(() => jest.resetAllMocks())

  it('calls onComposedPages with the compose args instead of PUTing site-config itself', async () => {
    MockImportFlow.__setSummary({
      imported: [{ assetId: 'new1', publicUrl: 'https://cdn/new1.jpg', source: { provider: 'generic', externalCollectionId: 'c1', sourceUrl: 'https://old-site/1.jpg' } }],
      collections: [{ id: 'c1', name: 'Travel' }],
      importBatchId: 'batch1',
      replicate: true,
      siteMap: { pages: [{ kind: 'gallery', title: 'Travel', collectionId: 'c1' }] },
    })

    global.fetch = jest.fn((url, opts) => {
      const u = String(url)
      if (u.includes('/api/admin/library') && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ images: [], portfolios: {}, galleries: {}, assets: {}, assetOrder: [], sets: {}, savedViews: {}, counts: {} }) })
      }
      if (u.includes('/api/admin/library') && opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
      }
      if (u.includes('/api/admin/site-config')) {
        throw new Error('AdminLibrary should not talk to site-config directly when onComposedPages is provided')
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const onComposedPages = jest.fn()
    render(<AdminLibrary onBack={() => {}} siteConfig={{ pages: [] }} onComposedPages={onComposedPages} />)

    fireEvent.click(await screen.findByText(/import from your other sites/i))
    fireEvent.click(await screen.findByText(/mock complete import/i))

    await waitFor(() => expect(onComposedPages).toHaveBeenCalledTimes(1))
    expect(onComposedPages).toHaveBeenCalledWith(expect.objectContaining({
      importBatchId: 'batch1',
      siteMap: expect.objectContaining({ pages: expect.any(Array) }),
      collections: expect.any(Array),
      imported: expect.any(Array),
    }))
  })
})

// Requirement 4 regression: fetch-batch dedupe-skips photos already in the
// library, so `summary.imported` comes back empty even though the user chose
// to rebuild pages. AdminLibrary must resolve those skipped remoteUrls against
// the library's assets (keyed by source.sourceUrl) before composing, and must
// not bail out early just because nothing new was imported.
describe('AdminLibrary composes pages from photos that were dedupe-skipped (already in the library)', () => {
  afterEach(() => jest.resetAllMocks())

  it('resolves skipped remoteUrls against the library and still calls onComposedPages with composable assets', async () => {
    const existingAsset = {
      assetId: 'existing1',
      publicUrl: 'https://cdn/existing1.jpg',
      source: { provider: 'generic', externalCollectionId: 'c1', sourceUrl: 'https://old-site/1.jpg' },
    }

    MockImportFlow.__setSummary({
      imported: [],
      skipped: ['https://old-site/1.jpg'],
      collections: [{ id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'https://old-site/1.jpg' }] }],
      importBatchId: 'batch1',
      replicate: true,
      siteMap: { pages: [{ kind: 'gallery', title: 'Travel', collectionId: 'c1' }] },
    })

    global.fetch = jest.fn((url, opts) => {
      const u = String(url)
      if (u.includes('/api/admin/library') && (!opts || opts.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            images: [], portfolios: {}, galleries: {},
            assets: { existing1: existingAsset },
            assetOrder: [], sets: {}, savedViews: {}, counts: {},
          }),
        })
      }
      if (u.includes('/api/admin/library') && opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
      }
      if (u.includes('/api/admin/print/settings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      if (u.includes('/api/admin/site-config')) {
        throw new Error('AdminLibrary should not talk to site-config directly when onComposedPages is provided')
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const onComposedPages = jest.fn()
    render(<AdminLibrary onBack={() => {}} siteConfig={{ pages: [] }} onComposedPages={onComposedPages} />)

    fireEvent.click(await screen.findByText(/import from your other sites/i))
    fireEvent.click(await screen.findByText(/mock complete import/i))

    await waitFor(() => expect(onComposedPages).toHaveBeenCalledTimes(1))
    expect(onComposedPages).toHaveBeenCalledWith(expect.objectContaining({
      importBatchId: 'batch1',
      imported: [existingAsset],
    }))

    // No new-asset PUT should have been necessary, but a compose-only run
    // must not throw if a PUT never happens — assert it simply didn't crash
    // and no site-config call was attempted (covered by the fetch mock above).
  })
})
