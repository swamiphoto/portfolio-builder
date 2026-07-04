// __tests__/components/PrintAffordance.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PrintAffordance from '../../components/image-displays/print/PrintAffordance'

const print = { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' }

it('shows the affordance and calls onOpen when clicked', () => {
  const onOpen = jest.fn()
  render(<PrintAffordance print={print} printStore={{ markup: 3, showPriceOnImage: false }} onOpen={onOpen} />)
  const btn = screen.getByRole('button', { name: /available as a print/i })
  fireEvent.click(btn)
  expect(onOpen).toHaveBeenCalled()
})

it('appends a starting price when showPriceOnImage is on', () => {
  render(<PrintAffordance print={print} printStore={{ markup: 3, showPriceOnImage: true }} onOpen={() => {}} />)
  expect(screen.getByText(/from \$/i)).toBeInTheDocument()
})
