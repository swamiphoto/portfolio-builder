import { render, screen } from '@testing-library/react'
import PageGalleryLinks from '../../components/image-displays/gallery/page-gallery/PageGalleryLinks'

const pages = [
  { id: 'a', title: 'Cali', slug: 'cali', thumbnail: { imageUrl: 'x.jpg' } },
  { id: 'b', title: 'Nevada', slug: 'nevada', thumbnail: { imageUrl: 'y.jpg' } },
]

describe('PageGalleryLinks', () => {
  it('list renders two links with correct hrefs and no reversed rows', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="list" linkBase="/site" />
    )
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toBe('/site/cali')
    expect(links[1].getAttribute('href')).toBe('/site/nevada')
    links.forEach((a) => expect(a.className).not.toMatch(/flex-row-reverse/))
  })

  it('alternating reverses the second row', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="alternating" linkBase="/site" />
    )
    const links = container.querySelectorAll('a')
    expect(links[0].className).not.toMatch(/md:flex-row-reverse/)
    expect(links[1].className).toMatch(/md:flex-row-reverse/)
  })

  it('grid uses square thumbnails and renders titles', () => {
    const { container } = render(
      <PageGalleryLinks pages={pages} variant="grid" linkBase="/site" />
    )
    const squares = container.querySelectorAll('img.aspect-square')
    expect(squares.length).toBe(2)
    expect(screen.getByText('Cali')).toBeInTheDocument()
    expect(screen.getByText('Nevada')).toBeInTheDocument()
  })

  it('renders nothing when there are no pages', () => {
    const { container } = render(<PageGalleryLinks pages={[]} variant="list" linkBase="/site" />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
