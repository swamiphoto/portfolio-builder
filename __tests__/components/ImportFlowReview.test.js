// __tests__/components/ImportFlowReview.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportFlow from '@/components/admin/import/ImportFlow'
import * as client from '@/common/import/importClient'

jest.mock('@/common/import/importClient', () => ({
  __esModule: true,
  discoverSource: jest.fn(),
  importSelected: jest.fn(),
  makeImportBatchId: () => 'imp_test',
}))

const discovery = {
  provider: 'generic',
  site: { title: 'Joe', url: 'https://joe.com/' },
  totalAssets: 3,
  collections: [
    { id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }, { remoteUrl: 'u2' }] },
    { id: 'c2', name: 'Food', assetRefs: [{ remoteUrl: 'u3' }] },
  ],
}

async function toReview() {
  client.discoverSource.mockResolvedValue(discovery)
  render(<ImportFlow variant="modal" onClose={() => {}} onComplete={jest.fn()} />)
  fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
  fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
  await screen.findByText(/import all 3 photos/i)
}

describe('ImportFlow review + import', () => {
  afterEach(() => jest.resetAllMocks())

  it('shows discovered galleries and imports all by default', async () => {
    client.importSelected.mockImplementation(async ({ onProgress }) => {
      onProgress?.({ done: 3, total: 3, importedCount: 3, failedCount: 0 })
      return { imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }], failed: [], skipped: [], total: 3 }
    })
    await toReview()
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /import all 3 photos/i }))
    await waitFor(() => expect(client.importSelected).toHaveBeenCalled())
    const arg = client.importSelected.mock.calls[0][0]
    expect(arg.selectedCollections).toHaveLength(2)
    expect(await screen.findByText(/go to my studio/i)).toBeInTheDocument()
  })

  it('excludes an unchecked gallery from the import', async () => {
    client.importSelected.mockResolvedValue({ imported: [], failed: [], skipped: [], total: 2 })
    await toReview()
    // deselect the "Food" (c2) album card
    fireEvent.click(screen.getByRole('button', { name: /Food/i }))
    fireEvent.click(screen.getByRole('button', { name: /import all 2 photos/i }))
    await waitFor(() => expect(client.importSelected).toHaveBeenCalled())
    const arg = client.importSelected.mock.calls[0][0]
    expect(arg.selectedCollections.map((c) => c.id)).toEqual(['c1'])
  })

  it('carries the skipped (dedupe-matched) remoteUrls into the summary passed to onComplete', async () => {
    client.importSelected.mockImplementation(async ({ onProgress }) => {
      onProgress?.({ done: 3, total: 3, importedCount: 0, failedCount: 0 })
      return { imported: [], failed: [], skipped: ['u1', 'u2', 'u3'], total: 3 }
    })
    const onComplete = jest.fn()
    client.discoverSource.mockResolvedValue(discovery)
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={onComplete} />)
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
    fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
    await screen.findByText(/import all 3 photos/i)
    fireEvent.click(screen.getByRole('button', { name: /import all 3 photos/i }))
    fireEvent.click(await screen.findByRole('button', { name: /go to my studio/i }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ skipped: ['u1', 'u2', 'u3'] }))
  })

  it('for a single gallery, drops the "across" phrasing and the select-all row', async () => {
    client.discoverSource.mockResolvedValue({
      provider: 'generic',
      site: { title: 'Solo', url: 'https://solo.com/' },
      totalAssets: 5,
      collections: [
        { id: 'only', name: 'Everything', assetRefs: [{ remoteUrl: 'a' }, { remoteUrl: 'b' }, { remoteUrl: 'c' }, { remoteUrl: 'd' }, { remoteUrl: 'e' }] },
      ],
    })
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'solo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
    expect(await screen.findByText('We found 5 photos.')).toBeInTheDocument()
    expect(screen.queryByText(/across/i)).toBeNull()
    expect(screen.queryByText(/select all/i)).toBeNull()
    expect(screen.queryByText(/photos selected/i)).toBeNull()
    // no back button anymore, either
    expect(screen.queryByText(/← Back/)).toBeNull()
  })

  it('cover thumbnails prefer thumbUrl over remoteUrl, falling back to remoteUrl when absent', async () => {
    client.discoverSource.mockResolvedValue({
      provider: 'generic',
      site: { title: 'Joe', url: 'https://joe.com/' },
      totalAssets: 2,
      collections: [
        {
          id: 'c1',
          name: 'Travel',
          assetRefs: [
            { remoteUrl: 'https://cdn/big1.jpg', thumbUrl: 'https://cdn/small1.jpg' },
            { remoteUrl: 'https://cdn/big2.jpg' },
          ],
        },
      ],
    })
    const { container } = render(<ImportFlow variant="modal" onClose={() => {}} onComplete={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
    fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
    await screen.findByText(/import all 2 photos/i)

    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toContain('https://cdn/small1.jpg') // has thumbUrl -> use it
    expect(srcs).not.toContain('https://cdn/big1.jpg') // never the large remoteUrl when a thumb exists
    expect(srcs).toContain('https://cdn/big2.jpg') // no thumbUrl -> falls back to remoteUrl
  })

  it('deselect all / select all toggles every gallery at once', async () => {
    await toReview()
    // starts all-selected → the toggle offers "Deselect all"
    fireEvent.click(screen.getByRole('button', { name: /deselect all/i }))
    expect(screen.getByRole('button', { name: /import all 0 photos/i })).toBeDisabled()
    // now it offers "Select all" → restores every gallery
    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(screen.getByRole('button', { name: /import all 3 photos/i })).toBeEnabled()
  })
})
