import { render, screen } from '@testing-library/react'
import ContactDisplay from '@/components/contact/ContactDisplay'

describe('ContactDisplay design options', () => {
  it('centers the heading when align=center', () => {
    const { container } = render(<ContactDisplay heading="Get in touch" subheading="hi" buttonText="Send" align="center" buttonStyle="solid" />)
    const wrap = container.querySelector('[data-contact-wrap]')
    expect(wrap.style.textAlign).toBe('center')
  })
  it('renders an outline submit button when buttonStyle=outline', () => {
    render(<ContactDisplay heading="H" subheading="s" buttonText="Send" align="left" buttonStyle="outline" />)
    const btn = screen.getByRole('button', { name: /send/i })
    expect(btn.getAttribute('data-btn-style')).toBe('outline')
  })
})
