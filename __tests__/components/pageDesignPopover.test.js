// __tests__/components/pageDesignPopover.test.js
import React from 'react'
import { render, screen } from '@testing-library/react'
jest.mock('@/components/admin/platform/PopoverShell', () => ({ __esModule: true, default: ({ title, children }) => <div><h1>{title}</h1>{children}</div> }))
import PageDesignPopover from '@/components/admin/platform/PageDesignPopover'

it('titles the popover "Design" and shows Button style when packages are enabled', () => {
  const page = { cover: { imageUrl: 'x', height: 'partial', buttonStyle: 'solid' }, clientFeatures: { enabled: true, purchase: { enabled: true } } }
  render(<PageDesignPopover page={page} onUpdate={() => {}} onClose={() => {}} anchorEl={null} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
  expect(screen.getByText('Button style')).toBeInTheDocument()
})
