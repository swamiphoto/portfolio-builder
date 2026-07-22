// __tests__/client-engagement/engagementContext.purchase.test.js
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ClientEngagementProvider, useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'

jest.mock('@/common/clientIdentity', () => ({
  getClientIdentity: jest.fn(() => ({ deviceId: 'd1', name: 'Mia', email: 'mia@x.com' })),
  saveClientIdentity: jest.fn((u, v) => ({ deviceId: 'd1', ...v })),
}))

const CF = { enabled: true, purchase: { enabled: true, packages: [{ id: 'pkg_a', label: 'Ten', credits: 10, price: 4000 }] } }

function Probe() {
  const ctx = useClientEngagement()
  return (
    <div>
      <span data-testid="cur">{ctx.purchaseCurrency}</span>
      <button onClick={() => ctx.buyPackage('pkg_a')}>buy</button>
    </div>
  )
}

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ url: 'https://stripe/cs_1' }) }))
  delete window.location
  window.location = { pathname: '/gallery', search: '', href: '' }
})

it('exposes currency from the currency prop and checks out an identified buyer', async () => {
  render(
    <ClientEngagementProvider username="ada" pageId="p1" pageSlug="gallery" clientFeatures={CF} paymentsReady currency="EUR" heroPresent>
      <Probe />
    </ClientEngagementProvider>
  )
  expect(screen.getByTestId('cur').textContent).toBe('EUR')
  await act(async () => { fireEvent.click(screen.getByText('buy')); await Promise.resolve() })
  const call = global.fetch.mock.calls.find(c => c[0] === '/api/client/purchase/checkout')
  expect(call).toBeTruthy()
  expect(JSON.parse(call[1].body)).toMatchObject({ username: 'ada', pageId: 'p1', packageId: 'pkg_a', buyer: { email: 'mia@x.com' } })
})
