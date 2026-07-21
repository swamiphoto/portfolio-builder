import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorFeedbackProvider, EditorPhotoBadge, useEditorFeedback } from '@/components/admin/gallery-builder/EditorFeedbackContext'

const byPhoto = {
  'https://cdn/a.jpg': { favBy: ['Priya'], favCount: 1, comments: [{ id: 'c1', name: 'Priya', text: 'love it', ts: Date.now() }], commentCount: 1 },
}

function Toggle() {
  const { showFeedback, setShowFeedback } = useEditorFeedback()
  return <button onClick={() => setShowFeedback(!showFeedback)}>toggle {String(showFeedback)}</button>
}

beforeEach(() => localStorage.clear())

it('badge is hidden until showFeedback is on, then opens the popover', async () => {
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/a.jpg" /></div>
      <Toggle />
    </EditorFeedbackProvider>
  )
  expect(screen.queryByLabelText('View client feedback')).toBeNull()
  await userEvent.click(screen.getByText(/toggle false/))
  await userEvent.click(screen.getByLabelText('View client feedback'))
  expect(await screen.findByText('love it')).toBeTruthy()
})

it('renders no badge for a url with no feedback', async () => {
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/none.jpg" /></div>
      <Toggle />
    </EditorFeedbackProvider>
  )
  await userEvent.click(screen.getByText(/toggle false/))
  expect(screen.queryByLabelText('View client feedback')).toBeNull()
})

it('persists showFeedback across remounts via localStorage', () => {
  localStorage.setItem('sepia:show-feedback', '1')
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/a.jpg" /></div>
    </EditorFeedbackProvider>
  )
  expect(screen.getByLabelText('View client feedback')).toBeTruthy()
})
