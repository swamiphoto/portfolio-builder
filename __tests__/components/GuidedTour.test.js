// __tests__/components/GuidedTour.test.js
import { render, screen, fireEvent, act } from '@testing-library/react'
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

  it('does not finish right away when anchors are missing, but gives up after the retry window', () => {
    jest.useFakeTimers()
    try {
      const onFinish = jest.fn()
      render(<GuidedTour steps={[{ selector: '[data-tour="missing"]', title: 'x', body: 'y' }]} onFinish={onFinish} />)
      // It waits (anchors may still be mounting) rather than marking the tour seen.
      expect(onFinish).not.toHaveBeenCalled()
      // After the polling window (~2.5s) with no anchor, it gives up.
      act(() => { jest.advanceTimersByTime(3000) })
      expect(onFinish).toHaveBeenCalledWith('done')
    } finally {
      jest.useRealTimers()
    }
  })
})
