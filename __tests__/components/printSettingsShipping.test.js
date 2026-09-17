import { render, screen, fireEvent } from '@testing-library/react'
import SiteSettingsPopover from '../../components/admin/platform/SiteSettingsPopover'

// The print-settings drill-in is reached via `initialView="print"`, which
// mounts PrintView directly — no anchorEl/positioning needed for these
// assertions since PopoverShell renders its children regardless of position.
function renderPrintSettings(printStore = {}) {
  const onUpdate = jest.fn()
  const { container } = render(
    <SiteSettingsPopover
      siteConfig={{ printStore }}
      anchorEl={null}
      onUpdate={onUpdate}
      onClose={() => {}}
      initialView="print"
    />
  )
  return { onUpdate, container }
}

// PrintView fetches payout status + earnings on mount; stub fetch so those
// calls resolve quietly and don't affect the assertions below.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})
afterEach(() => jest.resetAllMocks())

// PopoverShell keeps its content `visibility: hidden` until it can measure a
// real anchorEl's position (which we don't provide here). dom-accessibility-api
// treats that subtree as inaccessible and computes every accessible name as ""
// — even for elements with an explicit aria-label — so getByRole(name) queries
// don't work here. Select by literal text (pill toggles) or a CSS attribute
// selector (the switch) instead of relying on accessible-name computation.
it('choosing Budget shipping calls updatePrintStore with shippingMethod: budget', () => {
  const { onUpdate } = renderPrintSettings({ shippingMethod: 'standard' })

  fireEvent.click(screen.getByText('Budget'))

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ printStore: expect.objectContaining({ shippingMethod: 'budget' }) })
  )
})

it('toggling free shipping on calls updatePrintStore with freeShipping: true', () => {
  const { onUpdate, container } = renderPrintSettings({ freeShipping: false })

  fireEvent.click(container.querySelector('button[aria-label="Offer free shipping"]'))

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ printStore: expect.objectContaining({ freeShipping: true }) })
  )
})

it('with free shipping on, typing a buffer calls updatePrintStore with shippingBuffer in cents', () => {
  const { onUpdate } = renderPrintSettings({ freeShipping: true, shippingBuffer: 0 })

  // The buffer input is the only number input with placeholder "0" — the
  // markup field (also type=number) uses placeholder "3", so this is unambiguous.
  const bufferInput = screen.getByPlaceholderText('0')
  fireEvent.change(bufferInput, { target: { value: '5.5' } })

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ printStore: expect.objectContaining({ shippingBuffer: 550 }) })
  )
})

it('does not show the buffer input when free shipping is off', () => {
  renderPrintSettings({ freeShipping: false })
  expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument()
})

it('toggling "End prices in $9" on calls updatePrintStore with priceRounding: charm9', () => {
  const { onUpdate, container } = renderPrintSettings({ priceRounding: 'nearest5' })

  fireEvent.click(container.querySelector('button[aria-label="End prices in $9"]'))

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ printStore: expect.objectContaining({ priceRounding: 'charm9' }) })
  )
})
