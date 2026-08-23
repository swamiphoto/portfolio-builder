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
  { type: 'photo', image: P(1024, 1200, 1000), caption: 'Keizersgracht', florenceFrame: 'mat', themeState: { florence: { variant: 'centered' } } },
  { type: 'photos', images: [{ url: P(1033), caption: 'Singel' }, { url: P(1037), caption: 'Prinsengracht' }, { url: P(1041), caption: 'Herengracht' }], florenceFrame: 'mixed', themeState: { florence: { variant: 'row' } } },
  { type: 'text', content: 'MED · top' }, row('medium', 'top', [1015, 1016]),
  { type: 'text', content: 'MED · center' }, row('medium', 'center', [1018, 1020]),
  { type: 'text', content: 'MED · bottom' }, row('medium', 'bottom', [1021, 1022]),
]

// ?empty=1 seeds only empty blocks to check the placeholder previews.
const EMPTY_BLOCKS = [
  { type: 'photo', themeState: { florence: { variant: 'centered' } }, florenceFrame: 'mat' },
  { type: 'photo' },
  { type: 'photos', themeState: { florence: { variant: 'row' } } },
  { type: 'photos', florenceFrame: 'mixed', themeState: { florence: { variant: 'row' } } },
  { type: 'photos', themeState: { florence: { variant: 'mosaic' } } },
  { type: 'text' },
  { type: 'video' },
  { type: 'testimonial' },
  { type: 'testimonial', themeState: { florence: { variant: 'quote-above' } } },
]

// ?mosaic=1 seeds mosaic + row blocks at medium/small with center/bottom anchors,
// to check that Position moves the block when the size doesn't fill the height.
const MOSAIC_BLOCKS = [
  { type: 'photos', ...photos([1033, 1037, 1041, 1043, 1050]), size: 'medium', florenceAnchor: 'center', themeState: { florence: { variant: 'mosaic' } } },
  { type: 'photos', ...photos([1033, 1037, 1041, 1043, 1050]), size: 'small', florenceAnchor: 'bottom', themeState: { florence: { variant: 'mosaic' } } },
  row('small', 'bottom', [1015, 1016, 1018]),
]
const SITE = { siteName: 'Florence Test', design: { theme: 'florence' }, pages: [{ id: 'p1', title: 'Work', slug: 'work', showInNav: true }], contact: {} }
const CHILD_PAGES = [
  { id: 'c1', title: 'Portraits', slug: 'portraits', showInNav: true },
  { id: 'c2', title: 'Landscapes', slug: 'landscapes', showInNav: true },
  { id: 'c3', title: 'Still Life', slug: 'still-life', showInNav: true },
]

export default function FlorencePreview() {
  const q = useRouter().query
  const pane = q.pane
  const empty = q.empty
  const blocks = empty ? EMPTY_BLOCKS : (q.mosaic ? MOSAIC_BLOCKS : BLOCKS)
  const gallery = <Gallery name="Florence Test" description="Position test." blocks={blocks} showPlaceholders={!!empty} pages={SITE.pages} childPages={CHILD_PAGES} siteConfig={SITE} themeId="florence" cover={{ imageUrl: P(1015, 2000, 1300), linksPosition: q.links === 'above' ? 'above' : undefined }} opener="hero" />
  const inner = (
    <ThemeProvider themeId="florence">
      <div className="theme-shell" data-viewport="desktop" data-admin-preview={pane ? 'true' : undefined}>
        {/* In ?pane mode, reproduce the admin's nested wrappers (theme-content +
            a second ThemeProvider inside GalleryPreview) so the fit is tested for real. */}
        {pane
          ? <div className="theme-content"><ThemeProvider themeId="florence">{gallery}</ThemeProvider></div>
          : gallery}
      </div>
    </ThemeProvider>
  )
  if (!pane) return inner
  // Mimic the admin preview pane: a scrollable box. ?tall makes it near-full-height
  // like the real editor pane (the 600px default stresses the short-pane fit).
  return (
    <div style={{ height: q.tall ? '94vh' : '600px', overflowY: 'auto', border: '4px solid red' }}>
      {inner}
    </div>
  )
}
