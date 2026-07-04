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
    expect(screen.getByText(/16x24/i)).toBeInTheDocument()
  })

  it('prompts for a higher-res upload and forwards the chosen file', () => {
    const onUploadMaster = jest.fn()
    const asset = makeAsset({ sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10' })
    render(<SellAsPrintPanel asset={asset} printStore={printStore} onSellChange={() => {}} onUploadMaster={onUploadMaster} />)
    expect(screen.getByText(/higher-resolution/i)).toBeInTheDocument()
    const file = new File(['x'], 'master.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload a higher-resolution file/i), { target: { files: [file] } })
    expect(onUploadMaster).toHaveBeenCalledWith(file)
  })
})
