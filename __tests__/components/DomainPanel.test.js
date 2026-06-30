import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DomainPanel from '../../components/admin/platform/DomainPanel'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => jest.resetAllMocks())

function jsonOnce(body) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) })
}

it('connects a domain and shows the DNS record to set', async () => {
  jsonOnce({ customDomain: {
    name: 'photos.janedoe.com', status: 'pending',
    verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
  } })
  const onUpdate = jest.fn()
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={onUpdate} />)

  fireEvent.change(screen.getByPlaceholderText('photos.yourname.com'), { target: { value: 'photos.janedoe.com' } })
  fireEvent.click(screen.getByRole('button', { name: /connect/i }))

  await waitFor(() => expect(screen.getByText('cname.vercel-dns.com')).toBeInTheDocument())
  expect(screen.getAllByText(/CNAME/i).length).toBeGreaterThan(0)
  expect(global.fetch).toHaveBeenCalledWith('/api/admin/domain/connect', expect.objectContaining({ method: 'POST' }))
  expect(onUpdate).toHaveBeenCalled()
})

it('shows an Active badge for a verified domain', () => {
  render(<DomainPanel siteConfig={{ customDomain: { name: 'a.com', status: 'active', verification: [] } }} username="jane" onUpdate={() => {}} />)
  expect(screen.getByText(/active/i)).toBeInTheDocument()
})

it('searches for a new domain and renders an available result with a registrar link', async () => {
  jsonOnce({ results: [
    { domain: 'janedoe.com', available: false, price: null, registrarUrl: 'https://reg/janedoe.com' },
    { domain: 'janedoe.photo', available: true, price: 25, registrarUrl: 'https://reg/janedoe.photo' },
  ] })
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={() => {}} />)

  fireEvent.change(screen.getByPlaceholderText(/find a new domain/i), { target: { value: 'janedoe' } })
  fireEvent.submit(screen.getByPlaceholderText(/find a new domain/i).closest('form'))

  await waitFor(() => expect(screen.getByText('janedoe.photo')).toBeInTheDocument())
  const getIt = screen.getByRole('link', { name: /get it/i })
  expect(getIt).toHaveAttribute('href', 'https://reg/janedoe.photo')
})
