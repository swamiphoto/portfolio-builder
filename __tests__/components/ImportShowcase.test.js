import { render, act, fireEvent } from '@testing-library/react'
import ImportShowcase from '@/components/admin/import/ImportShowcase'

const photos = Array.from({ length: 6 }, (_, i) => `https://example.com/p${i}.jpg`)

describe('ImportShowcase', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows a value-prop pitch, leading with music slideshows', () => {
    const { getByText } = render(<ImportShowcase progress={{ done: 12, total: 40 }} photos={photos} />)
    expect(getByText('Galleries set to music.')).toBeTruthy()
    expect(getByText(/sits through to the end/)).toBeTruthy()
  })

  it('drifts prints in one at a time, spread out over time (a show, not a burst)', () => {
    const { container } = render(<ImportShowcase progress={{ done: 1, total: 6 }} photos={photos} />)
    const count = () => container.querySelectorAll('.showcase-photo').length
    expect(count()).toBe(0)
    act(() => { jest.advanceTimersByTime(500) })   // first print eases in
    expect(count()).toBe(1)
    act(() => { jest.advanceTimersByTime(2700) })   // next, unhurried
    expect(count()).toBe(2)
  })

  it('shows a tasteful importing note, a progress bar, and a gentle count', () => {
    const { getByTestId, getByText, container } = render(<ImportShowcase progress={{ done: 20, total: 40 }} photos={photos} sourceLabel="joe.com" />)
    expect(getByTestId('showcase-progress').style.width).toBe('50%')
    expect(getByText(/importing your photos from joe\.com/i)).toBeTruthy()
    expect(container.textContent).toMatch(/20\s*\/\s*40/)
  })

  it('switches the note to a settling message once complete', () => {
    const { getByText } = render(<ImportShowcase progress={{ done: 40, total: 40 }} photos={photos} />)
    expect(getByText(/setting up your studio/i)).toBeTruthy()
  })

  it('fires onCancel from the escape hatch', () => {
    const onCancel = jest.fn()
    const { getByText } = render(<ImportShowcase progress={{ done: 0, total: 10 }} photos={photos} onCancel={onCancel} />)
    fireEvent.click(getByText('Skip to my studio'))
    expect(onCancel).toHaveBeenCalled()
  })
})
