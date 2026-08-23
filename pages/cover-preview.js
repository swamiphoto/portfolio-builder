// pages/cover-preview.js
// Dev-only playground for the home cover (PageCover). Query params drive the design:
//   ?layout=centered|bottom  ?overlay=light|medium|dark  ?logoSize=small|medium|large
//   ?logoColor=original|light|dark  ?buttonStyle=solid|outline  ?heading=Text  ?nologo=1
// 404s in production.
import { useRouter } from 'next/router'
import PageCover from '../components/image-displays/page/PageCover'
import ThemeProvider from '../components/image-displays/ThemeProvider'

export async function getServerSideProps() {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

const IMG = 'https://picsum.photos/id/1015/2400/1500'
// A dark monochrome wordmark, so ?logoColor=light inverts it to white on a photo.
const LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96">' +
  '<text x="4" y="58" font-family="Georgia,serif" font-style="italic" font-size="52" fill="#111">Swami</text>' +
  '<text x="8" y="84" font-family="Arial" font-size="13" letter-spacing="5" fill="#111">PHOTOGRAPHY</text></svg>'
)
const DESC = 'Published **photographer**, [podcaster](https://example.com), and photography coach based in the Bay Area. Focusing on [landscapes](https://example.com), [portraits](https://example.com), and [Bollywood](https://example.com).'

export default function CoverPreview() {
  const router = useRouter()
  const q = router.query
  const cover = {
    imageUrl: IMG,
    variant: 'cover',
    height: 'full',
    heading: typeof q.heading === 'string' ? q.heading : '',
    subheading: DESC,
    buttonText: 'View My Work',
    buttonStyle: q.buttonStyle === 'outline' ? 'outline' : 'solid',
    layout: ['bottom', 'split', 'minimal'].includes(q.layout) ? q.layout : 'centered',
    overlay: ['light', 'dark'].includes(q.overlay) ? q.overlay : 'medium',
    logoSize: ['small', 'large'].includes(q.logoSize) ? q.logoSize : 'medium',
    logoColor: ['original', 'dark'].includes(q.logoColor) ? q.logoColor : 'light',
  }
  return (
    <ThemeProvider themeId="kyoto">
      <div className="theme-shell">
        <PageCover
          cover={cover}
          title={cover.heading}
          description={cover.subheading}
          siteName="Swami Photography"
          logo={q.nologo ? '' : LOGO}
          primaryButton={{ label: cover.buttonText, href: '#' }}
          themeId="kyoto"
          descriptionFontFamily={'"Cormorant Garamond", Georgia, serif'}
          titleFontFamily={'"Cormorant Garamond", Georgia, serif'}
          buttonFontFamily={'"Cormorant Garamond", Georgia, serif'}
        />
      </div>
    </ThemeProvider>
  )
}
