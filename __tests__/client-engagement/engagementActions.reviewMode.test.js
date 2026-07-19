import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewFeedbackProvider } from '@/components/image-displays/engagement/ClientEngagementContext'
import EngagementActions from '@/components/image-displays/engagement/EngagementActions'

const byPhoto = {
  'https://cdn/a.jpg': { favBy: ['Priya'], favCount: 2, comments: [], commentCount: 1 },
}

it('renders a static feedback badge in review mode and calls onOpenPhoto', async () => {
  const onOpenPhoto = jest.fn()
  render(
    <ReviewFeedbackProvider feedbackByPhoto={byPhoto} onOpenPhoto={onOpenPhoto}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ReviewFeedbackProvider>
  )
  const badge = screen.getByLabelText('View client feedback')
  expect(badge.textContent).toContain('2') // favs
  expect(badge.textContent).toContain('1') // comments
  // no interactive client buttons in review mode
  expect(screen.queryByLabelText('Favorite photo')).toBeNull()
  await userEvent.click(badge)
  expect(onOpenPhoto).toHaveBeenCalledWith('https://cdn/a.jpg')
})

it('renders nothing in review mode for a photo with no feedback', () => {
  const { container } = render(
    <ReviewFeedbackProvider feedbackByPhoto={byPhoto} onOpenPhoto={() => {}}>
      <EngagementActions imageUrl="https://cdn/none.jpg" />
    </ReviewFeedbackProvider>
  )
  expect(container.querySelector('[aria-label="View client feedback"]')).toBeNull()
})
