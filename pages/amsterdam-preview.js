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

const BLOCKS = [
  { type: 'photo', image: P(1015, 1600, 1000), caption: 'HERENGRACHT (2024)\narchival pigment print' },
  { type: 'text', content: 'Four hundred years of water, brick and light.' },
  { type: 'photos', images: [{ url: P(1039) }, { url: P(1043), caption: 'JORDAAN' }, { url: P(1044) }] },
  { type: 'text', content: 'Shot over three winters along the canal ring.', amsterdamStyle: 'quiet', themeState: { amsterdam: { variant: 'body' } } },
  { type: 'photos', images: [{ url: P(1050) }, { url: P(1051) }, { url: P(1052) }, { url: P(1053) }, { url: P(1054) }], themeState: { amsterdam: { variant: 'mosaic' } } },
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
  const siteConfig = { ...SITE, design: { theme: themeId, amsterdamInk: ink } }
  return (
    <ThemeProvider themeId={themeId}>
      <div className="theme-shell">
        <Gallery
          name="Van der Meer"
          description="Photographs from the canal ring, 2021–2026."
          blocks={BLOCKS}
          pages={siteConfig.pages}
          siteConfig={siteConfig}
          themeId={themeId}
          cover={{ imageUrl: P(1015, 2000, 1300) }}
          opener="hero"
        />
      </div>
    </ThemeProvider>
  )
}
