import { render } from '@testing-library/react'
import FlorenceWall from '@/components/image-displays/themes/florence/FlorenceWall'

function renderWall(blocks, siteConfig = {}, extra = {}) {
  return render(<FlorenceWall name="W" siteConfig={siteConfig} blocks={blocks} {...extra} />)
}

describe('FlorenceColumn text block', () => {
  it('renders plain text as-is', () => {
    const { container } = renderWall([{ type: 'text', content: 'Plain words' }])
    expect(container.querySelector('.florence-text').textContent).toBe('Plain words')
  })

  it('renders markdown text blocks formatted, not as literal markdown syntax', () => {
    const { container } = renderWall([{ type: 'text', content: '**bold** words', format: 'markdown' }])
    const text = container.querySelector('.florence-col--text')
    expect(text.querySelector('strong')).toBeTruthy()
    expect(text.querySelector('strong').textContent).toBe('bold')
    expect(text.textContent).not.toContain('**')
  })
})
