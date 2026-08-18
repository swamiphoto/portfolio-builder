import { render, screen, fireEvent } from '@testing-library/react'
import ImportDoneStep from '@/components/admin/import/ImportDoneStep'

const siteMapSummary = {
  importedCount: 12, failedCount: 0, setsCount: 2,
  site: { title: 'Jane' },
  imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }],
  collections: [{ id: 'c1', name: 'Portraits', assetRefs: [{ remoteUrl: 'u' }] }],
  siteMap: { pages: [
    { kind: 'gallery', title: 'Portraits', collectionId: 'c1' },
    { kind: 'about', title: 'About', collectionId: 'about' },
  ] },
}

describe('ImportDoneStep', () => {
  it('shows the doorway copy and count, fires onEnter', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 12, failedCount: 0 }} onEnter={onEnter} onImportAnother={() => {}} />)
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument()
    expect(screen.getByText(/find all your photos in your library/i)).toBeInTheDocument()
    // No photo count and no "we spotted N galleries" framing on this screen.
    expect(screen.queryByText(/ready to use\./i)).toBeNull()
    expect(screen.queryByText(/spotted/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /go to my studio/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: false }))
  })

  it('offers import from another site', () => {
    const onImportAnother = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 0 }} onEnter={() => {}} onImportAnother={onImportAnother} />)
    fireEvent.click(screen.getByRole('button', { name: /import from another site/i }))
    expect(onImportAnother).toHaveBeenCalled()
  })

  it('shows a soft note when some failed, with no em-dash', () => {
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 2 }} onEnter={() => {}} onImportAnother={() => {}} />)
    const note = screen.getByText(/couldn't be copied over/i)
    expect(note.textContent).not.toContain('—')
  })

  it('offers the rebuild choice when site structure was found', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
    fireEvent.click(screen.getByRole('button', { name: /build my pages for me/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: true }))
  })

  it('lets the user keep photos library-only', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
    fireEvent.click(screen.getByRole('button', { name: /i'll build my own/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: false }))
  })

  it('shows no rebuild choice without a site map', () => {
    render(<ImportDoneStep summary={{ importedCount: 3, siteMap: null }} onEnter={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /build my pages/i })).toBeNull()
  })

  it('offers the rebuild choice when every photo in a gallery was dedupe-skipped (already in the library)', () => {
    const onEnter = jest.fn()
    const summary = {
      importedCount: 0, failedCount: 0,
      imported: [],
      skipped: ['u1', 'u2'],
      collections: [{ id: 'c1', name: 'Portraits', assetRefs: [{ remoteUrl: 'u1' }, { remoteUrl: 'u2' }] }],
      siteMap: { pages: [{ kind: 'gallery', title: 'Portraits', collectionId: 'c1' }] },
    }
    render(<ImportDoneStep summary={summary} onEnter={onEnter} />)
    expect(screen.getByText(/head start/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /build my pages for me/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: true }))
  })

  it('shows no rebuild choice when the site map has pages but none are describable (all "other")', () => {
    render(<ImportDoneStep summary={{
      importedCount: 3,
      imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }],
      collections: [{ id: 'c1', name: 'Misc', assetRefs: [{ remoteUrl: 'u' }] }],
      siteMap: { pages: [{ kind: 'other', title: 'Blog', collectionId: 'c1' }] },
    }} onEnter={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /build my pages/i })).toBeNull()
    expect(screen.getByRole('button', { name: /go to my studio/i })).toBeInTheDocument()
  })
})
