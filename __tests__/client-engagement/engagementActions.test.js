// __tests__/client-engagement/engagementActions.test.js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientEngagementProvider } from '@/components/image-displays/engagement/ClientEngagementContext'
import EngagementActions from '@/components/image-displays/engagement/EngagementActions'

const CF = { enabled: true, favorites: { enabled: true }, comments: { enabled: true } }

beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      people: { d9: { name: 'Raj' } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd9', ts: 1 }],
      comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd9', text: 'nice', ts: 2 }],
      submissions: [],
    }),
  })
})

it('renders nothing outside a provider', () => {
  const { container } = render(<EngagementActions imageUrl="https://cdn/a.jpg" />)
  expect(container.firstChild).toBeNull()
})

it('renders heart with count and comment with count', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(screen.getByLabelText('Favorite photo').textContent).toContain('1'))
  expect(screen.getByLabelText('Comments on photo').textContent).toContain('1')
})

it('opens the comments panel on comment click', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(screen.getByLabelText('Comments on photo')).toBeTruthy())
  await userEvent.click(screen.getByLabelText('Comments on photo'))
  expect(await screen.findByText('nice')).toBeTruthy()
})
