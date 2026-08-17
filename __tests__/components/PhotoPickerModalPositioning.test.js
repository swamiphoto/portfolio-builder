import { render } from '@testing-library/react'
import PhotoPickerModal from '@/components/admin/gallery-builder/PhotoPickerModal'

// jsdom has no ResizeObserver; the Library tab's virtualized grid uses one.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function getShell() {
  return document.querySelector('[data-photo-picker]')
}

it('defaults to the legacy fixed position when no anchor is given', () => {
  render(
    <PhotoPickerModal images={[]} loading={false} blockType="photo" onConfirm={jest.fn()} onClose={jest.fn()} />
  )
  const shell = getShell()
  expect(shell.style.left).toBe('526px')
  expect(shell.style.top).toBe('80px')
})

it('opens to the left of an anchored panel when anchorRight is given, instead of centered/default', () => {
  const originalWidth = window.innerWidth
  window.innerWidth = 1200
  render(
    <PhotoPickerModal images={[]} loading={false} blockType="photo" onConfirm={jest.fn()} onClose={jest.fn()} anchorRight={440} />
  )
  const shell = getShell()
  // 1200 - 440 (panel) - 16 (gap) - 456 (picker's initial rail-collapsed width) = 288
  expect(shell.style.left).toBe('288px')
  window.innerWidth = originalWidth
})

it('never opens off the left edge of the viewport when the anchor leaves no room', () => {
  const originalWidth = window.innerWidth
  window.innerWidth = 600
  render(
    <PhotoPickerModal images={[]} loading={false} blockType="photo" onConfirm={jest.fn()} onClose={jest.fn()} anchorRight={440} />
  )
  const shell = getShell()
  expect(parseInt(shell.style.left, 10)).toBeGreaterThanOrEqual(16)
  window.innerWidth = originalWidth
})

it('stacks above docked panels like the markdown editor (zIndex 80/81) so clicks reach it', () => {
  render(
    <PhotoPickerModal images={[]} loading={false} blockType="photo" onConfirm={jest.fn()} onClose={jest.fn()} />
  )
  expect(getShell().className).toMatch(/z-\[90\]/)
})
