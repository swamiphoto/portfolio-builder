// __tests__/components/PhotoLightboxPrint.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoLightbox from '../../components/image-displays/PhotoLightbox'
import { PrintStoreProvider } from '../../components/image-displays/print/PrintStoreContext'

const sellable = { url: 'https://x/a.jpg', caption: 'A', print: { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' } }
const plain = { url: 'https://x/b.jpg', caption: 'B' }

// The configurator drawer lives in the PrintStoreProvider (mounted by Gallery in
// production). Wrap the lightbox in it so clicking the button can open it.
function renderInStore(ui, printStore) {
  return render(<PrintStoreProvider printStore={printStore}>{ui}</PrintStoreProvider>)
}

it('shows the Buy a Print button for a sellable image when the store is enabled', () => {
  renderInStore(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />, { enabled: true, markup: 3 })
  expect(screen.getByRole('button', { name: /buy a print/i })).toBeInTheDocument()
})

it('hides the Buy a Print button when the store is disabled', () => {
  renderInStore(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: false, markup: 3 }} />, { enabled: false, markup: 3 })
  expect(screen.queryByRole('button', { name: /buy a print/i })).toBeNull()
})

it('hides the Buy a Print button for a non-sellable image', () => {
  renderInStore(<PhotoLightbox images={[plain]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />, { enabled: true, markup: 3 })
  expect(screen.queryByRole('button', { name: /buy a print/i })).toBeNull()
})

it('opens the configurator drawer when the Buy a Print button is clicked', () => {
  renderInStore(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />, { enabled: true, markup: 3 })
  expect(screen.queryByRole('button', { name: /buy this print/i })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /buy a print/i }))
  expect(screen.getByRole('button', { name: /buy this print/i })).toBeInTheDocument()
})

it('closes the configurator drawer via its close control', () => {
  renderInStore(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />, { enabled: true, markup: 3 })
  fireEvent.click(screen.getByRole('button', { name: /buy a print/i }))
  expect(screen.getByRole('button', { name: /buy this print/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /close print options/i }))
  expect(screen.queryByRole('button', { name: /buy this print/i })).toBeNull()
})
