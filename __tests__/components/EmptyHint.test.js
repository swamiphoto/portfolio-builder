// __tests__/components/EmptyHint.test.js
import { render, screen } from '@testing-library/react'
import EmptyHint from '@/components/admin/onboarding/EmptyHint'

describe('EmptyHint', () => {
  it('renders its message', () => {
    render(<EmptyHint>No pages yet. What you add here will appear on your site&rsquo;s menu.</EmptyHint>)
    expect(screen.getByText(/will appear on your site/)).toBeInTheDocument()
  })
})
