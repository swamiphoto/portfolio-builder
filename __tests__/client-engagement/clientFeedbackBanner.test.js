import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorFeedbackProvider } from '@/components/admin/gallery-builder/EditorFeedbackContext'
import ClientFeedbackBanner from '@/components/admin/platform/ClientFeedbackBanner'

const byPhoto = {
  'a': { favBy: ['Priya'], favCount: 3, comments: [{ id: 'c', name: 'Raj', text: 'x', ts: 1 }], commentCount: 1 },
}

function wrap(ui) {
  return render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={100}>
      {ui}
    </EditorFeedbackProvider>
  )
}

beforeEach(() => localStorage.clear())

it('shows a summary when there is unseen feedback', () => {
  wrap(<ClientFeedbackBanner />)
  expect(screen.getByText(/favorite/i)).toBeTruthy()
})

it('is hidden once the page has been marked seen at/after lastActivityTs', () => {
  localStorage.setItem('sepia:feedback-seen:p1', '100')
  wrap(<ClientFeedbackBanner />)
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
})

it('"Show on photos" marks seen and dismisses', async () => {
  wrap(<ClientFeedbackBanner />)
  await userEvent.click(screen.getByText(/Show on photos/i))
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
  expect(localStorage.getItem('sepia:feedback-seen:p1')).toBe('100')
})

it('✕ marks seen without changing the toggle', async () => {
  wrap(<ClientFeedbackBanner />)
  await userEvent.click(screen.getByLabelText('Dismiss'))
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
  expect(localStorage.getItem('sepia:show-feedback')).not.toBe('1')
})
