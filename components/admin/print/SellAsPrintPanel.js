// components/admin/print/SellAsPrintPanel.js
import React from 'react'

const LARGEST_SIZE_ID = '24x36' // matches the top of SEED_CATALOG.sizes

export default function SellAsPrintPanel({ asset, printStore, onSellChange, onUploadMaster }) {
  const print = asset?.print || {}
  const sellable = !!print.sellable
  const canGoBigger = !print.maxSharpSize || print.maxSharpSize !== LARGEST_SIZE_ID

  return (
    <div className="sell-as-print-panel">
      <label>
        <span>Sell as print</span>
        <button
          type="button"
          role="switch"
          aria-checked={sellable}
          aria-label="Sell as print"
          onClick={() => onSellChange(!sellable)}
        >
          {sellable ? 'On' : 'Off'}
        </button>
      </label>

      {sellable && (
        <>
          <p className="max-size">
            {print.maxSharpSize
              ? `Prints sharply up to ${print.maxSharpSize}.`
              : 'This image is too small to print sharply.'}
          </p>

          {canGoBigger && (
            <div className="upload-master">
              <label htmlFor="sell-as-print-upload">Upload a higher-resolution file</label>
              <input
                id="sell-as-print-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  if (file) onUploadMaster(file)
                }}
              />
            </div>
          )}

          {print.availableSizes?.length > 0 && (
            <p className="sizes-summary">
              {print.availableSizes.length} size
              {print.availableSizes.length === 1 ? '' : 's'} available
            </p>
          )}
        </>
      )}
    </div>
  )
}
