// __tests__/components/DuplicateFinder.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DuplicateFinder from '@/components/admin/library/DuplicateFinder'
import * as client from '@/common/library/dedupClient'

jest.mock('@/common/library/dedupClient', () => ({
  __esModule: true,
  backfillHashes: jest.fn(),
  applyHashes: (cfg) => cfg,
  groupDuplicates: jest.fn(),
  runConsolidation: jest.fn(),
}))

const libraryData = {
  assets: {
    keep: { assetId: 'keep', publicUrl: 'https://cdn/keep.jpg', hashes: { exact: 'H' }, usage: { usageCount: 3, galleryIds: ['japan'] }, createdAt: '2026-01-01' },
    dup: { assetId: 'dup', publicUrl: 'https://cdn/dup.jpg', hashes: { exact: 'H' }, usage: { usageCount: 0, galleryIds: ['best'] }, createdAt: '2026-01-02' },
  },
}

describe('DuplicateFinder', () => {
  afterEach(() => jest.resetAllMocks())
  it('scans, shows the duplicate group, and merges', async () => {
    client.backfillHashes.mockResolvedValue({ hashes: {}, failed: [] })
    client.groupDuplicates.mockReturnValue([{ hash: 'H', assetIds: ['keep', 'dup'] }])
    client.runConsolidation.mockResolvedValue({ mergedCount: 1, groupCount: 1, deletedFiles: 1 })
    render(<DuplicateFinder libraryData={libraryData} siteConfig={{ pages: [] }} onClose={() => {}} onComplete={jest.fn()} minScanMs={0} />)
    expect(await screen.findByText(/merge all/i)).toBeInTheDocument()
    expect(screen.getByText(/2 copies/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /merge all/i }))
    await waitFor(() => expect(client.runConsolidation).toHaveBeenCalled())
    const arg = client.runConsolidation.mock.calls[0][0]
    expect(arg.decisions).toEqual([{ canonicalId: 'keep', redundantIds: ['dup'] }])
    expect(await screen.findByText(/done/i)).toBeInTheDocument()
  })
  it('shows a clean-library message when there are no duplicates', async () => {
    client.backfillHashes.mockResolvedValue({ hashes: {}, failed: [] })
    client.groupDuplicates.mockReturnValue([])
    render(<DuplicateFinder libraryData={libraryData} siteConfig={{ pages: [] }} onClose={() => {}} onComplete={jest.fn()} minScanMs={0} />)
    expect(await screen.findByText(/no duplicates found/i)).toBeInTheDocument()
  })
})
