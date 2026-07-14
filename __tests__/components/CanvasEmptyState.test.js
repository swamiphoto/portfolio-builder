// __tests__/components/CanvasEmptyState.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import CanvasEmptyState from '@/components/admin/onboarding/CanvasEmptyState'

describe('CanvasEmptyState', () => {
  it('renders the welcome and fires onAddPage', () => {
    const onAddPage = jest.fn()
    render(<CanvasEmptyState onAddPage={onAddPage} />)
    expect(screen.getByText(/create your first page/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add a page/i }))
    expect(onAddPage).toHaveBeenCalled()
  })
})
