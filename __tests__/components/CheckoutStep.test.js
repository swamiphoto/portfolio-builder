// __tests__/components/CheckoutStep.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CheckoutStep from '../../components/image-displays/print/CheckoutStep'

it('submits the address once required fields are filled', () => {
  const onSubmit = jest.fn()
  render(<CheckoutStep onBack={() => {}} onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'b@x.com' } })
  fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '1 A St' } })
  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Town' } })
  fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '90210' } })
  fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'b@x.com', line1: '1 A St', country: 'US' }))
})

it('calls onBack', () => {
  const onBack = jest.fn()
  render(<CheckoutStep onBack={onBack} onSubmit={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /back to options/i }))
  expect(onBack).toHaveBeenCalled()
})

it('shows shipping and total when amounts are provided', () => {
  render(<CheckoutStep onBack={() => {}} onSubmit={() => {}} amounts={{ shippingCost: 600, total: 3000 }} />)
  expect(screen.getByText(/shipping \$6\.00/i)).toBeInTheDocument()
  expect(screen.getByText(/total \$30\.00/i)).toBeInTheDocument()
})
