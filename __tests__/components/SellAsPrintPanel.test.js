// __tests__/components/SellAsPrintPanel.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SellAsPrintPanel from '../../components/admin/print/SellAsPrintPanel'

const printStore = { enabled: true, markup: 3, showPriceOnImage: false, currency: 'USD' }

function makeAsset(overrides = {}) {
  return {
    assetId: 'a1',
    width: 6000,
    height: 4000,
    print: { sellable: false, minDpi: 240, availableSizes: [], maxSharpSize: null, ...overrides },
  }
}

describe('SellAsPrintPanel', () => {
  it('calls onSellChange(true) when the toggle is turned on', () => {
    const onSellChange = jest.fn()
    render(<SellAsPrintPanel asset={makeAsset()} printStore={printStore} onSellChange={onSellChange} onUploadMaster={() => {}} />)
    fireEvent.click(screen.getByRole('switch', { name: /sell as print/i }))
    expect(onSellChange).toHaveBeenCalledWith(true)
  })

  it('shows the max sharp size when sellable', () => {
    const asset = makeAsset({ sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' })
    render(<SellAsPrintPanel asset={asset} printStore={printStore} onSellChange={() => {}} onUploadMaster={() => {}} />)
    expect(screen.getByText(/16 × 24/)).toBeInTheDocument()
  })

  it('warns when the photo is too small to print sharply', () => {
    // The full-res upload moved to the lightbox File panel; this panel now only
    // reflects print quality. With no sharp size, it warns and points there.
    const asset = makeAsset({ sellable: true, availableSizes: [], maxSharpSize: null })
    render(<SellAsPrintPanel asset={asset} onSellChange={() => {}} />)
    expect(screen.getByText(/too small to print sharply/i)).toBeInTheDocument()
  })
})
