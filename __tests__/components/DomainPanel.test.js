import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DomainPanel from '../../components/admin/platform/DomainPanel'

// Route fetch by URL so the component's follow-up calls (provider, status polls)
// don't blow up the primary-call assertions.
function mockFetch(routes) {
  global.fetch = jest.fn((url, opts) => {
    for (const [frag, body] of Object.entries(routes)) {
      if (String(url).includes(frag)) return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}
afterEach(() => jest.resetAllMocks())

it('connects a domain and shows the DNS record as copyable fields', async () => {
  mockFetch({
    '/connect': { customDomain: {
      name: 'photos.janedoe.com', status: 'pending',
      verification: [{ type: 'CNAME', name: 'photos', value: 'cname.vercel-dns.com' }],
    } },
    '/provider': { provider: { id: 'godaddy', name: 'GoDaddy', dnsUrl: 'https://godaddy/dns' } },
  })
  const onUpdate = jest.fn()
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={onUpdate} />)

  fireEvent.change(screen.getByPlaceholderText('photos.yourname.com'), { target: { value: 'photos.janedoe.com' } })
  fireEvent.click(screen.getByRole('button', { name: /connect/i }))

  // Record value + each labeled field render
  await waitFor(() => expect(screen.getByText('cname.vercel-dns.com')).toBeInTheDocument())
  expect(screen.getByText('CNAME')).toBeInTheDocument()
  expect(screen.getByText('photos')).toBeInTheDocument()
  expect(screen.getByText('Value')).toBeInTheDocument()
  // Provider guidance appears once detected
  await waitFor(() => expect(screen.getByRole('link', { name: /open GoDaddy DNS/i })).toHaveAttribute('href', 'https://godaddy/dns'))
  expect(onUpdate).toHaveBeenCalled()
})

it('shows a connected domain with a visit link, details, and no "Connected" badge or lock', () => {
  mockFetch({})
  render(<DomainPanel siteConfig={{ customDomain: { name: 'a.com', status: 'active', verification: [] } }} username="jane" onUpdate={() => {}} />)
  expect(screen.getByText('a.com')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /visit/i })).toHaveAttribute('href', 'https://a.com')
  // The lock icon + "Connected" label are gone; managing the domain is still possible.
  expect(screen.queryByText(/connected/i)).not.toBeInTheDocument()
  expect(screen.queryByText('🔒')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /remove domain/i })).toBeInTheDocument()
})

it('searches for a new domain and renders an available result with a registrar link', async () => {
  mockFetch({ '/search': { results: [
    { domain: 'janedoe.com', available: false, price: null, registrarUrl: 'https://reg/janedoe.com' },
    { domain: 'janedoe.photo', available: true, price: 25, registrarUrl: 'https://reg/janedoe.photo' },
  ] } })
  render(<DomainPanel siteConfig={{ customDomain: null }} username="jane" onUpdate={() => {}} />)

  fireEvent.change(screen.getByPlaceholderText(/find a new domain/i), { target: { value: 'janedoe' } })
  fireEvent.submit(screen.getByPlaceholderText(/find a new domain/i).closest('form'))

  await waitFor(() => expect(screen.getByText('janedoe.photo')).toBeInTheDocument())
  expect(screen.getByRole('link', { name: /get it/i })).toHaveAttribute('href', 'https://reg/janedoe.photo')
})
