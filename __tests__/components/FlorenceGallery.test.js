// __tests__/components/FlorenceGallery.test.js
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))

function renderGallery(props) {
  return render(
    <Gallery
      blocks={props.blocks}
      themeId={props.themeId}
      name={props.name}
      description={props.description}
      siteConfig={props.siteConfig || {}}
    />
  )
}

const CAPTURE = { capturedAt: '2024-03-12T12:00:00Z', cameraModel: 'Nikon Z6', lens: '50mm', focalLengthMm: 50, aperture: 'f/1.8', shutterSpeed: '1/250', iso: 400 }

describe('Florence horizontal museum wall', () => {
  it('renders the stage + rail + intro column with the gallery name/description', () => {
    const { container } = renderGallery({ blocks: [], themeId: 'florence', name: 'Ljubomir Ivanović', description: 'Serbian painter' })
    expect(container.querySelector('.florence-stage')).toBeTruthy()
    expect(container.querySelector('.florence-rail')).toBeTruthy()
    expect(container.querySelector('.florence-intro__title').textContent).toBe('Ljubomir Ivanović')
    expect(container.querySelector('.florence-intro__desc').textContent).toBe('Serbian painter')
  })

  it('lays each block out as a section: single photo + a horizontal photo Row', () => {
    const blocks = [
      { type: 'photo', image: 'https://x/one.jpg', caption: 'UNTITLED (1940)\npencil on paper' },
      { type: 'photos', images: [{ url: 'https://x/a.jpg', caption: 'OHRID (1935)' }, { url: 'https://x/b.jpg', caption: '' }] },
    ]
    const { container } = renderGallery({ blocks, themeId: 'florence', name: 'Show' })
    // Single photo defaults to Fill: edge-to-edge with an overlaid plaque.
    expect(container.querySelector('.florence-col--fill')).toBeTruthy()
    expect(container.querySelector('.florence-fill-label .florence-caption__title').textContent).toContain('UNTITLED (1940)')
    // Row: the captioned image gets a beneath plaque, the uncaptioned one none.
    expect(container.querySelector('.florence-col--photorow .florence-row')).toBeTruthy()
    expect(container.querySelectorAll('.florence-row .florence-caption').length).toBe(1)
    expect(container.textContent).toContain('OHRID (1935)')
  })

  it('renders a Mosaic photo set as varied side-by-side groups', () => {
    const imgs = Array.from({ length: 5 }, (_, i) => ({ url: `https://x/${i}.jpg` }))
    const block = { type: 'photos', themeState: { florence: { variant: 'mosaic' } }, images: imgs }
    const { container } = renderGallery({ blocks: [block], themeId: 'florence', name: 'M' })
    expect(container.querySelector('.florence-col--mosaic .florence-mosaic')).toBeTruthy()
    // pattern [1,2,3,1,2] over 5 images → groups of 1 then 2 then (remaining 2)
    expect(container.querySelectorAll('.florence-mosaic__group').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('.florence-mosaic img').length).toBe(5)
  })

  it('renders contact / testimonial / page-gallery blocks as sections', () => {
    const blocks = [
      { type: 'contact', heading: 'Get in touch', buttonText: 'Send' },
      { type: 'testimonial', text: 'A wonderful show.', name: 'A. Critic' },
      { type: 'page-gallery', pageIds: ['pg'] },
    ]
    const pages = [{ id: 'pg', title: 'Landscapes', slug: 'landscapes' }]
    const { container } = render(
      <Gallery blocks={blocks} themeId="florence" name="X" siteConfig={{ contact: { email: 'a@b.co' } }} pages={pages} />
    )
    expect(container.querySelector('.florence-col--contact')).toBeTruthy()
    expect(container.querySelector('.florence-col--testimonial')).toBeTruthy()
    expect(container.querySelector('.florence-col--pagelinks')).toBeTruthy()
    expect(container.textContent).toContain('Landscapes')
  })

  it('renders the menu column (closed) from the site pages, with socials', () => {
    const siteConfig = {
      siteName: 'Museum',
      pages: [{ id: 'p1', title: 'Memorial', slug: 'memorial', showInNav: true }],
      contact: { instagram: 'x', facebook: 'y' },
    }
    const { container } = renderGallery({ blocks: [], themeId: 'florence', name: 'Museum', siteConfig })
    const menu = container.querySelector('.florence-menu')
    expect(menu.getAttribute('data-open')).toBe('false')
    expect(container.querySelector('.florence-menu__link').textContent).toBe('Memorial')
    expect(container.querySelectorAll('.florence-menu__social').length).toBe(2)
  })

  it('shows capture metadata beneath a photo per the Photo details mode', () => {
    const block = { type: 'photo', image: 'https://x/one.jpg', caption: 'OHRID', capture: CAPTURE }
    // EXIF mode → date + gear + exposure beneath the manual caption.
    const exif = renderGallery({ blocks: [block], themeId: 'florence', name: 'S', siteConfig: { design: { theme: 'florence', florencePhotoMeta: 'exif' } } })
    expect(exif.container.querySelector('.florence-caption__title').textContent).toBe('OHRID')
    const meta = exif.container.querySelector('.florence-caption__meta').textContent
    expect(meta).toContain('March 12, 2024')
    expect(meta).toContain('Nikon Z6')
    expect(meta).toContain('ISO 400')
  })

  it('Photo details Off hides capture metadata (manual caption only)', () => {
    const block = { type: 'photo', image: 'https://x/one.jpg', caption: 'OHRID', capture: CAPTURE }
    const { container } = renderGallery({ blocks: [block], themeId: 'florence', name: 'S', siteConfig: { design: { theme: 'florence', florencePhotoMeta: 'off' } } })
    expect(container.querySelector('.florence-caption__title').textContent).toBe('OHRID')
    expect(container.querySelector('.florence-caption__meta')).toBeNull()
  })

  it('defaults to Date mode (capture date beneath the photo)', () => {
    const block = { type: 'photo', image: 'https://x/one.jpg', capture: CAPTURE }
    const { container } = renderGallery({ blocks: [block], themeId: 'florence', name: 'S' })
    expect(container.querySelector('.florence-caption__meta').textContent).toBe('March 12, 2024')
  })

  it('applies the chosen photo treatment to the gallery container', () => {
    const { container } = renderGallery({
      blocks: [], themeId: 'florence',
      siteConfig: { design: { theme: 'florence', photoTreatment: 'sepia' } },
    })
    expect(container.querySelector('.gallery-container').getAttribute('data-photo-treatment')).toBe('sepia')
  })

  it('defaults photo treatment to colour when unset', () => {
    const { container } = renderGallery({ blocks: [], themeId: 'florence' })
    expect(container.querySelector('.gallery-container').getAttribute('data-photo-treatment')).toBe('colour')
  })
})
