// pages/amsterdam-preview.js
// Dev-only playground for the Amsterdam poster wall: one seeded page covering
// every block treatment. ?ink=ultramarine|black swaps the ink; ?theme=florence
// renders the same seed through Florence (regression comparison for the shared
// useWallScroll hook). 404s in production.
import { useRouter } from 'next/router'
import Gallery from '../components/image-displays/gallery/Gallery'
import ThemeProvider from '../components/image-displays/ThemeProvider'

export async function getServerSideProps() {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

const P = (id, w = 900, h = 1200) => `https://picsum.photos/id/${id}/${w}/${h}`

const LONG = 'The seventeenth-century canals are a world-renowned location of cultural and historical significance, with a rich history spanning four hundred years of development, expansion, innovation and engineering. The city’s canal ring and its design is an early example of large-scale, coordinated urban planning and forward thinking.'

const LONGCAP = 'In the 15 years I’ve been a photographer, I’ve tried every portfolio builder, and not one felt like it was truly made for the work.'

const BLOCKS = [
  { type: 'photo', image: P(1016, 1600, 1000), caption: LONGCAP },
  { type: 'photo', image: P(1015, 1000, 1500), caption: LONGCAP, themeState: { amsterdam: { variant: 'centered' } } },
  // Frame styles: a single Card-mounted photo, then a Mixed-mounted set.
  { type: 'photo', image: P(1024, 1400, 1000), caption: 'Keizersgracht', capture: { capturedAt: '1902-01-01T00:00:00Z' }, amsterdamFrame: 'card' },
  { type: 'photos', images: [{ url: P(1033), caption: 'Oudezijds' }, { url: P(1037), caption: 'Prinsengracht' }, { url: P(1041), caption: 'Herengracht' }], amsterdamFrame: 'mixed', themeState: { amsterdam: { variant: 'row' } } },
  { type: 'text', content: 'Four hundred years of water, brick and light.' },
  { type: 'text', content: LONG, themeState: { amsterdam: { variant: 'body' } } },
  { type: 'photos', images: [{ url: P(1039) }, { url: P(1043), caption: 'Jordaan' }, { url: P(1044) }], themeState: { amsterdam: { variant: 'row', size: 'large' } } },
  { type: 'text', content: 'Shot over three winters along the canal ring.', amsterdamStyle: 'quiet', themeState: { amsterdam: { variant: 'body' } } },
  { type: 'photos', images: [{ url: P(1050), caption: 'Singel' }, { url: P(1051), caption: 'Brouwersgracht' }, { url: P(1052), caption: 'Bloemgracht' }, { url: P(1053), caption: 'Lijnbaansgracht' }, { url: P(1054), caption: 'Leliegracht' }], themeState: { amsterdam: { variant: 'mosaic' } } },
  { type: 'photo', image: P(1056, 1200, 900), caption: 'PRINSENGRACHT', themeState: { amsterdam: { variant: 'centered' } } },
  { type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'PROCESS FILM' },
  { type: 'testimonial', text: 'The prints are extraordinary — the water almost moves.', name: 'A. Collector' },
  { type: 'contact', heading: 'Commissions', subheading: 'Open for 2027 bookings.', buttonText: 'Write to me' },
]

const SITE = {
  siteName: 'Van der Meer',
  design: { theme: 'amsterdam' },
  pages: [
    { id: 'p1', title: 'Canals', slug: 'canals', showInNav: true },
    { id: 'p2', title: 'Portraits', slug: 'portraits', showInNav: true },
    { id: 'p3', title: 'About', slug: 'about', showInNav: true },
  ],
  contact: { instagram: '@vandermeer' },
}

export default function AmsterdamPreview() {
  const router = useRouter()
  const themeId = router.query.theme === 'florence' ? 'florence' : 'amsterdam'
  const ink = ['ultramarine', 'black'].includes(router.query.ink) ? router.query.ink : 'vermilion'
  const opener = router.query.opener === 'title' ? 'title' : 'hero'
  // ?name= lets us stress the title opener with a long word (fit / wrap check).
  const name = router.query.name || (opener === 'title' ? 'Landscapes' : 'Van der Meer')
  const siteConfig = { ...SITE, design: { theme: themeId, amsterdamInk: ink } }
  return (
    <ThemeProvider themeId={themeId}>
      <div className="theme-shell">
        <Gallery
          name={name}
          description="Photographs from the canal ring, 2021–2026."
          blocks={BLOCKS}
          pages={siteConfig.pages}
          siteConfig={siteConfig}
          themeId={themeId}
          cover={{ imageUrl: P(1015, 2000, 1300) }}
          opener={opener}
        />
      </div>
    </ThemeProvider>
  )
}
