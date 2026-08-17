// pages/florence-preview.js — dev-only Florence testbed. 404s in production.
// ?pane=1 wraps the stage in a short scrollable box to mimic the admin preview pane.
import { useRouter } from 'next/router'
import Gallery from '../components/image-displays/gallery/Gallery'
import ThemeProvider from '../components/image-displays/ThemeProvider'

export async function getServerSideProps() {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

const P = (id, w = 900, h = 1200) => `https://picsum.photos/id/${id}/${w}/${h}`
const photos = (ids) => ({ images: ids.map((id) => ({ url: P(id), caption: `#${id}` })) })
const row = (size, anchor, ids) => ({ type: 'photos', ...photos(ids), size, florenceAnchor: anchor, themeState: { florence: { variant: 'row' } } })

const BLOCKS = [
  { type: 'text', content: 'MED · top' }, row('medium', 'top', [1015, 1016]),
  { type: 'text', content: 'MED · center' }, row('medium', 'center', [1018, 1020]),
  { type: 'text', content: 'MED · bottom' }, row('medium', 'bottom', [1021, 1022]),
]
const SITE = { siteName: 'Florence Test', design: { theme: 'florence' }, pages: [{ id: 'p1', title: 'Work', slug: 'work', showInNav: true }], contact: {} }

export default function FlorencePreview() {
  const pane = useRouter().query.pane
  const inner = (
    <ThemeProvider themeId="florence">
      <div className="theme-shell" data-viewport="desktop">
        <Gallery name="Florence Test" description="Position test." blocks={BLOCKS} pages={SITE.pages} siteConfig={SITE} themeId="florence" cover={{ imageUrl: P(1015, 2000, 1300) }} opener="hero" />
      </div>
    </ThemeProvider>
  )
  if (!pane) return inner
  // Mimic the admin preview pane: a scrollable box shorter than the viewport.
  return (
    <div style={{ height: '600px', overflowY: 'auto', border: '4px solid red' }}>
      {inner}
    </div>
  )
}
