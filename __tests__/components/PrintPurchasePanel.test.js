// __tests__/components/PrintPurchasePanel.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PrintPurchasePanel from '../../components/image-displays/print/PrintPurchasePanel'

const print = { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' }
const printStore = { markup: 3, currency: 'USD' }
const baseSpec = { size: '8x10', finish: 'lustre', frame: 'none', frameColor: null, matte: false }

it('lists available sizes and reports a size change', () => {
  const onSpecChange = jest.fn()
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={baseSpec} onSpecChange={onSpecChange} />)
  fireEvent.click(screen.getByRole('button', { name: /16 × 24/i }))
  expect(onSpecChange).toHaveBeenCalledWith(expect.objectContaining({ size: '16x24' }))
})

it('reveals frame colors when a wood frame is chosen', () => {
  const onSpecChange = jest.fn()
  const spec = { ...baseSpec, frame: 'wood', frameColor: 'black' }
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={spec} onSpecChange={onSpecChange} />)
  expect(screen.getByRole('button', { name: /walnut/i })).toBeInTheDocument()
})

it('renders an enabled Buy CTA that calls onBuy when clicked', () => {
  const onBuy = jest.fn()
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={baseSpec} onSpecChange={() => {}} onBuy={onBuy} />)
  const cta = screen.getByRole('button', { name: /buy this print/i })
  expect(cta).not.toBeDisabled()
  fireEvent.click(cta)
  expect(onBuy).toHaveBeenCalled()
})
