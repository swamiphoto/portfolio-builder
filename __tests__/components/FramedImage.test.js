// __tests__/components/FramedImage.test.js
import React from 'react'
import { render, screen } from '@testing-library/react'
import FramedImage from '../../components/image-displays/print/FramedImage'

describe('FramedImage', () => {
  it('renders a plain image when unframed', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'none' }} />)
    expect(screen.queryByTestId('framed-image')).toBeNull()
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })

  it('wraps the image in a frame band when framed', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'wood', frameColor: 'black' }} />)
    const band = screen.getByTestId('framed-image')
    expect(band).toBeInTheDocument()
    expect(band).toHaveStyle({ background: '#2b2b2b' })
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })

  it('adds a mat layer when matte is on', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'wood', frameColor: 'black', matte: true }} />)
    expect(screen.getByTestId('framed-image-mat')).toBeInTheDocument()
  })
})
