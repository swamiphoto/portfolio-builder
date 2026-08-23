import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContactDisplay from '@/components/contact/ContactDisplay'

describe('ContactDisplay submit', () => {
  it('posts the site username (never a client-controlled recipient) so the server resolves the address', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
    const { container } = render(<ContactDisplay heading="H" buttonText="Send" username="janesmith" />)
    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: 'Visitor' } })
    fireEvent.change(container.querySelectorAll('input')[1], { target: { value: 'v@example.com' } })
    fireEvent.change(container.querySelector('textarea'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/contact')
    const body = JSON.parse(opts.body)
    expect(body.username).toBe('janesmith')
    expect(body).not.toHaveProperty('toEmail')
  })
})

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
