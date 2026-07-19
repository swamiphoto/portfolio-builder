import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoFeedbackPopover from '@/components/admin/gallery-builder/PhotoFeedbackPopover'

const feedback = {
  favBy: ['Priya', 'Raj'],
  favCount: 2,
  comments: [
    { id: 'c1', name: 'Priya', text: 'mom wants this', ts: Date.now() - 60000 },
    { id: 'c2', name: 'Raj', text: 'gorgeous', ts: Date.now() - 3600000 },
  ],
  commentCount: 2,
}

it('lists who favorited and every comment', () => {
  render(<PhotoFeedbackPopover feedback={feedback} onClose={() => {}} />)
  expect(screen.getByText(/Priya, Raj/)).toBeTruthy()
  expect(screen.getByText('mom wants this')).toBeTruthy()
  expect(screen.getByText('gorgeous')).toBeTruthy()
})

it('closes via the close button', async () => {
  const onClose = jest.fn()
  render(<PhotoFeedbackPopover feedback={feedback} onClose={onClose} />)
  await userEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalled()
})

it('shows an empty-comments hint when there are only favorites', () => {
  render(<PhotoFeedbackPopover feedback={{ favBy: ['Priya'], favCount: 1, comments: [], commentCount: 0 }} onClose={() => {}} />)
  expect(screen.getByText(/No comments/i)).toBeTruthy()
})
