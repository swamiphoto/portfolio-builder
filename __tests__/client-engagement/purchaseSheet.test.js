// __tests__/client-engagement/purchaseSheet.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PurchaseSheet from '@/components/image-displays/engagement/PurchaseSheet'
import * as CtxMod from '@/components/image-displays/engagement/ClientEngagementContext'

function withCtx(value) {
  jest.spyOn(CtxMod, 'useClientEngagement').mockReturnValue(value)
}

afterEach(() => jest.restoreAllMocks())

it('lists packages with formatted prices and calls startCheckout', () => {
  const startCheckout = jest.fn()
  withCtx({
    purchaseCurrency: 'USD',
    purchaseState: { unlockedCount: 2, ceiling: 2, all: false, remaining: 0 },
    packages: [
      { id: 'pkg_a', label: '10 more photos', credits: 10, price: 4000 },
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    startCheckout,
  })
  render(<PurchaseSheet onClose={() => {}} />)
  expect(screen.getByText('10 more photos')).toBeInTheDocument()
  expect(screen.getByText('$40.00')).toBeInTheDocument()
  expect(screen.getByText('$150.00')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(startCheckout).toHaveBeenCalledWith('pkg_all')
})
