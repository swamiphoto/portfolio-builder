import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportFlow from '@/components/admin/import/ImportFlow'
import * as client from '@/common/import/importClient'

jest.mock('@/common/import/importClient', () => ({
  __esModule: true,
  discoverSource: jest.fn(),
  makeImportBatchId: () => 'imp_test',
}))

describe('ImportFlow source step', () => {
  afterEach(() => jest.resetAllMocks())

  it('disables the button until a URL is entered, then calls discoverSource', async () => {
    client.discoverSource.mockResolvedValue({ provider: 'generic', site: { title: 'Joe', url: 'https://joe.com/' }, collections: [{ id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }] }], totalAssets: 1 })
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={() => {}} />)
    const button = screen.getByRole('button', { name: /find my photos/i })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    await waitFor(() => expect(client.discoverSource).toHaveBeenCalledWith('joe.com', undefined))
  })

  it('shows the error message and returns to the input on discovery failure', async () => {
    const err = Object.assign(new Error("We couldn't read that link."), { name: 'ImportError', status: 502 })
    client.discoverSource.mockRejectedValue(err)
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
    expect(await screen.findByText(/couldn't read that link/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/yourwebsite/i)).toHaveValue('bad')
  })
})
