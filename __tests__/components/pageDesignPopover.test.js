// __tests__/components/pageDesignPopover.test.js
import React from 'react'
import { render, screen } from '@testing-library/react'
jest.mock('@/components/admin/platform/PopoverShell', () => ({ __esModule: true, default: ({ title, children }) => <div><h1>{title}</h1>{children}</div> }))
import PageDesignPopover from '@/components/admin/platform/PageDesignPopover'

it('titles the popover "Design"; two buttons (client + packages) → "Primary button style"', () => {
  const page = { cover: { imageUrl: 'x', height: 'partial', buttonStyle: 'solid' }, clientFeatures: { enabled: true, purchase: { enabled: true } } }
  render(<PageDesignPopover page={page} onUpdate={() => {}} onClose={() => {}} anchorEl={null} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
  // The style control only drives the first button, so with 2+ buttons it's "Primary".
  expect(screen.getByText('Primary button style')).toBeInTheDocument()
})

it('a single button keeps the plain "Button style" label', () => {
  const page = { cover: { imageUrl: 'x', height: 'partial', buttonStyle: 'solid' }, slideshow: { enabled: true } }
  render(<PageDesignPopover page={page} onUpdate={() => {}} onClose={() => {}} anchorEl={null} />)
  expect(screen.getByText('Button style')).toBeInTheDocument()
  expect(screen.queryByText('Primary button style')).toBeNull()
})
