import { render, screen, fireEvent } from '@testing-library/react'
import ImportDoneStep from '@/components/admin/import/ImportDoneStep'

describe('ImportDoneStep', () => {
  it('shows the doorway copy and count, fires onEnter', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 12, failedCount: 0 }} onEnter={onEnter} onImportAnother={() => {}} />)
    expect(screen.getByText(/your photos are in/i)).toBeInTheDocument()
    expect(screen.getByText(/12 photos, ready to use/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /go to my studio/i }))
    expect(onEnter).toHaveBeenCalled()
  })

  it('offers import from another site', () => {
    const onImportAnother = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 0 }} onEnter={() => {}} onImportAnother={onImportAnother} />)
    fireEvent.click(screen.getByRole('button', { name: /import from another site/i }))
    expect(onImportAnother).toHaveBeenCalled()
  })

  it('shows a soft note when some failed, with no em-dash', () => {
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 2 }} onEnter={() => {}} onImportAnother={() => {}} />)
    const note = screen.getByText(/couldn't be brought in/i)
    expect(note.textContent).not.toContain('—')
  })
})
