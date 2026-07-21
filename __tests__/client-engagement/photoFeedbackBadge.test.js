import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoFeedbackBadge from '@/components/image-displays/engagement/PhotoFeedbackBadge'

it('renders nothing when there is no feedback', () => {
  const { container } = render(<PhotoFeedbackBadge favCount={0} commentCount={0} />)
  expect(container.firstChild).toBeNull()
})

it('shows only the non-zero counts', () => {
  render(<PhotoFeedbackBadge favCount={3} commentCount={0} />)
  const btn = screen.getByLabelText('View client feedback')
  expect(btn.textContent).toContain('3')
  expect(btn.querySelectorAll('svg')).toHaveLength(1) // heart only
})

it('shows both icons when both counts are set and fires onOpen', async () => {
  const onOpen = jest.fn()
  render(<PhotoFeedbackBadge favCount={2} commentCount={5} onOpen={onOpen} />)
  const btn = screen.getByLabelText('View client feedback')
  expect(btn.querySelectorAll('svg')).toHaveLength(2)
  expect(btn.textContent).toContain('2')
  expect(btn.textContent).toContain('5')
  await userEvent.click(btn)
  expect(onOpen).toHaveBeenCalledTimes(1)
})
