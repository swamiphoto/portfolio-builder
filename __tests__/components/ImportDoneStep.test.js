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
    expect(screen.getByText(/your photos are in/i)).toBeInTheDocument()
    expect(screen.getByText(/12 photos, ready to use/i)).toBeInTheDocument()
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
    const note = screen.getByText(/couldn't be brought in/i)
    expect(note.textContent).not.toContain('—')
  })

  it('offers the rebuild choice when site structure was found', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
    fireEvent.click(screen.getByRole('button', { name: /rebuild these pages/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: true }))
  })

  it('lets the user keep photos library-only', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={siteMapSummary} onEnter={onEnter} />)
    fireEvent.click(screen.getByRole('button', { name: /keep the photos/i }))
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({ replicate: false }))
  })

  it('shows no rebuild choice without a site map', () => {
    render(<ImportDoneStep summary={{ importedCount: 3, siteMap: null }} onEnter={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /rebuild/i })).toBeNull()
  })

  it('shows no rebuild choice when the site map has pages but none are describable (all "other")', () => {
    render(<ImportDoneStep summary={{
      importedCount: 3,
      imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }],
      collections: [{ id: 'c1', name: 'Misc', assetRefs: [{ remoteUrl: 'u' }] }],
      siteMap: { pages: [{ kind: 'other', title: 'Blog', collectionId: 'c1' }] },
    }} onEnter={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /rebuild/i })).toBeNull()
    expect(screen.getByRole('button', { name: /go to my studio/i })).toBeInTheDocument()
  })
})
