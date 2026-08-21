// pages/tofino-preview.js
// Dev-only playground for the Tofino surf-journal theme: one seeded page
// covering the top header, the offset scatter, framed photos, mono text and
// the boxed contact form. ?empty=1 previews the placeholder furniture;
// ?mobile=1 narrows nothing here (use the browser's device mode). 404s in prod.
import Gallery from '../components/image-displays/gallery/Gallery'
import SiteNav from '../components/image-displays/page/SiteNav'
import SiteFooter from '../components/image-displays/page/SiteFooter'
import ThemeProvider from '../components/image-displays/ThemeProvider'
import { useRouter } from 'next/router'

export async function getServerSideProps() {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

const P = (id, w = 900, h = 1200) => `https://picsum.photos/id/${id}/${w}/${h}`

const INTRO = 'Photography that feels like a road trip on an open highway — wild, untamed, and full of heart. Images that pull you into the moment, like you’re in the middle of a great song, with a bit of dust on your boots and a whole lot of sun on your face.'

const BLOCKS = [
  { type: 'text', content: INTRO },
  { type: 'photos', images: [
    { url: P(1011, 1000, 1400), caption: 'Volcom Photoshoot' },
    { url: P(1035, 900, 1200), caption: 'Skaters in Venice Beach' },
    { url: P(1016, 1400, 1000), caption: 'French Alps' },
    { url: P(1015, 1000, 1400), caption: 'VW Trip' },
    { url: P(1036, 1400, 1000), caption: 'West Coast' },
    { url: P(1039, 1000, 1400), caption: 'Waimea Bay Beach / Hawaii' },
    { url: P(1043, 1200, 1200), caption: 'Zion National Park' },
  ] },
  { type: 'text', content: 'Field Notes', themeState: { tofino: { variant: 'heading' } }, font: 'display' },
  { type: 'photos', images: [
    { url: P(1050, 1400, 1000), caption: 'Surf Session Tenerife' },
    { url: P(1051, 1000, 1400), caption: 'Baja California' },
    { url: P(1052, 1200, 900), caption: 'Highway One' },
  ], themeState: { tofino: { variant: 'masonry' } } },
  { type: 'photo', image: P(1080, 1400, 1000), caption: 'Golden hour at the point break' },
  { type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'Process film' },
  { type: 'testimonial', text: 'The prints arrived and they feel exactly like the trip did — warm, grainy, alive.', name: 'A. Collector' },
  { type: 'contact', heading: "Let's Connect", subheading: 'Open for bookings, collaborations and print orders.', buttonText: 'Send' },
]

// ?empty=1 seeds only empty blocks to check the placeholder previews.
const EMPTY_BLOCKS = [
  { type: 'photo' },
  { type: 'photos' },
  { type: 'photos', themeState: { tofino: { variant: 'masonry' } } },
  { type: 'text' },
  { type: 'video' },
  { type: 'testimonial' },
]

const SITE = {
  siteName: 'Tofino',
  design: { theme: 'tofino' },
  pages: [
    { id: 'p1', title: 'Work', slug: 'work', showInNav: true },
    { id: 'p2', title: 'Contact', slug: 'contact', showInNav: true },
  ],
  contact: { instagram: '@tofino' },
}

export default function TofinoPreview() {
  const router = useRouter()
  const empty = router.query.empty
  return (
    <ThemeProvider themeId="tofino">
      <div className="theme-shell" data-viewport="desktop" style={{ minHeight: '100vh', background: 'var(--theme-bg)' }}>
        <SiteNav siteConfig={SITE} username="tofino" themeId="tofino" basePath="" />
        <Gallery
          name=""
          description=""
          blocks={empty ? EMPTY_BLOCKS : BLOCKS}
          showPlaceholders={!!empty}
          pages={SITE.pages}
          siteConfig={SITE}
          themeId="tofino"
        />
        <SiteFooter siteConfig={SITE} />
      </div>
    </ThemeProvider>
  )
}
