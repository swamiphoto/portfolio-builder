import { render, screen, act } from '@testing-library/react'
import ImportRebuildProgress from '@/components/admin/import/ImportRebuildProgress'

jest.useFakeTimers()

it('shows a phase caption and calls onDone after the reveal sequence', () => {
  const onDone = jest.fn()
  render(<ImportRebuildProgress summary={{ imported: [{ publicUrl: 'https://gcs/a.jpg' }] }} onDone={onDone} />)
  expect(screen.getByText(/Reading your pages|Mapping your layout|Placing your blocks/i)).toBeInTheDocument()
  expect(onDone).not.toHaveBeenCalled()
  act(() => { jest.advanceTimersByTime(4000) })
  expect(onDone).toHaveBeenCalledTimes(1)
})
