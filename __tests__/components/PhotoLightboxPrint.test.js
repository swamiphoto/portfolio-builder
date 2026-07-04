// __tests__/components/PhotoLightboxPrint.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoLightbox from '../../components/image-displays/PhotoLightbox'

const sellable = { url: 'https://x/a.jpg', caption: 'A', print: { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' } }
const plain = { url: 'https://x/b.jpg', caption: 'B' }

it('shows the print affordance for a sellable image when the store is enabled', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  expect(screen.getByRole('button', { name: /available as a print/i })).toBeInTheDocument()
})

it('hides the affordance when the store is disabled', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: false, markup: 3 }} />)
  expect(screen.queryByRole('button', { name: /available as a print/i })).toBeNull()
})

it('hides the affordance for a non-sellable image', () => {
  render(<PhotoLightbox images={[plain]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  expect(screen.queryByRole('button', { name: /available as a print/i })).toBeNull()
})

it('opens the configurator when the affordance is clicked', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  fireEvent.click(screen.getByRole('button', { name: /available as a print/i }))
  expect(screen.getByRole('button', { name: /buy this print/i })).toBeInTheDocument()
})

it('closes the configurator when the panel close control is clicked', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  // Open the panel
  fireEvent.click(screen.getByRole('button', { name: /available as a print/i }))
  expect(screen.getByRole('button', { name: /buy this print/i })).toBeInTheDocument()
  // Close the panel via its close control
  fireEvent.click(screen.getByRole('button', { name: /close print options/i }))
  // Configurator is gone, affordance is back
  expect(screen.queryByRole('button', { name: /buy this print/i })).toBeNull()
  expect(screen.getByRole('button', { name: /available as a print/i })).toBeInTheDocument()
})
