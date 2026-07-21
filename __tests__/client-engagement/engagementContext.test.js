// __tests__/client-engagement/engagementContext.test.js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientEngagementProvider, useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'

const CF = { enabled: true, favorites: { enabled: true, submitWorkflow: false }, comments: { enabled: true }, watermark: { enabled: false } }

function Probe() {
  const ctx = useClientEngagement()
  if (!ctx) return <div data-testid="no-ctx" />
  return (
    <div>
      <div data-testid="count">{ctx.favoriteCount('https://cdn/a.jpg')}</div>
      <div data-testid="mine">{String(ctx.isFavorited('https://cdn/a.jpg'))}</div>
      <button onClick={() => ctx.toggleFavorite('https://cdn/a.jpg')}>heart</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ people: {}, favorites: [], comments: [], submissions: [] }),
  })
})

it('provides no context when clientFeatures disabled', () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={{ enabled: false }} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  expect(screen.getByTestId('no-ctx')).toBeTruthy()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('loads engagement on mount and prompts for identity on first heart', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  await userEvent.click(screen.getByText('heart'))
  expect(await screen.findByPlaceholderText('Your name')).toBeTruthy()
})

it('with identity saved, heart optimistically updates and POSTs', async () => {
  localStorage.setItem('sepia:client-identity:u', JSON.stringify({ deviceId: 'd1', name: 'Priya', email: 'priya@x.com' }))
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ people: {}, favorites: [], comments: [], submissions: [] }) }) // GET
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) // POSTs
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  await userEvent.click(screen.getByText('heart'))
  await waitFor(() => expect(screen.getByTestId('mine').textContent).toBe('true'))
  expect(screen.getByTestId('count').textContent).toBe('1')
  const postCalls = global.fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
  expect(postCalls.length).toBeGreaterThanOrEqual(1)
  expect(JSON.parse(postCalls[postCalls.length - 1][1].body)).toMatchObject({ action: 'favorite', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1' })
})
