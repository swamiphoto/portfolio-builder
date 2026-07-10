// __tests__/components/GuidedTour.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import GuidedTour from '@/components/admin/onboarding/GuidedTour'

const steps = [
  { selector: '[data-tour="a"]', title: 'First', body: 'Body one.' },
  { selector: '[data-tour="b"]', title: 'Second', body: 'Body two.' },
]
const welcome = { title: 'You are in.', body: 'Quick tour?', confirm: 'Show me', dismiss: 'I will explore' }

function withAnchors(ui) {
  return (
    <div>
      <button data-tour="a">A</button>
      <button data-tour="b">B</button>
      {ui}
    </div>
  )
}

describe('GuidedTour', () => {
  it('shows the welcome, dismiss calls onFinish(skip)', () => {
    const onFinish = jest.fn()
    render(withAnchors(<GuidedTour steps={steps} welcome={welcome} onFinish={onFinish} />))
    expect(screen.getByText('Quick tour?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('I will explore'))
    expect(onFinish).toHaveBeenCalledWith('skip')
  })

  it('walks steps and finishes done on the last Next', () => {
    const onFinish = jest.fn()
    render(withAnchors(<GuidedTour steps={steps} welcome={welcome} onFinish={onFinish} />))
    fireEvent.click(screen.getByText('Show me'))
    expect(screen.getByText('Body one.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Body two.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /got it|done|next/i }))
    expect(onFinish).toHaveBeenCalledWith('done')
  })

  it('finishes done immediately when no anchors resolve', () => {
    const onFinish = jest.fn()
    render(<GuidedTour steps={[{ selector: '[data-tour="missing"]', title: 'x', body: 'y' }]} onFinish={onFinish} />)
    expect(onFinish).toHaveBeenCalledWith('done')
  })
})
