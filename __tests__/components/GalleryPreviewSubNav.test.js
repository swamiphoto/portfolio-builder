// Regression guard: the inline sub-nav (variant 2) renders child links under the
// cover from inside the memoized <Gallery>. Switching the sub-nav variant only
// changes siteConfig.design.subNavStyle — not the edited gallery's blocks — so the
// preview memo must still recompute, or variant 2's links never show.
import { render, screen } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))

const GalleryPreview = require('../../components/admin/gallery-builder/GalleryPreview').default

const gallery = { name: 'Travel', description: '', blocks: [] }
const childPages = [
  { id: 'c1', title: 'Japan', slug: 'japan' },
  { id: 'c2', title: 'Iceland', slug: 'iceland' },
]
const withStyle = (subNavStyle) => ({ design: { subNavStyle } })

test('switching to sub-nav variant 2 (inline) shows child links live', () => {
  const { rerender } = render(
    <GalleryPreview gallery={gallery} pages={[]} childPages={childPages} siteConfig={withStyle('dropdown')} username="jane" />
  )
  // Variant 1 (dropdown): inline child links are not rendered under the cover.
  expect(screen.queryByText('Japan')).not.toBeInTheDocument()

  // Switch to variant 2 (inline) — only subNavStyle changed.
  rerender(
    <GalleryPreview gallery={gallery} pages={[]} childPages={childPages} siteConfig={withStyle('inline')} username="jane" />
  )
  expect(screen.getByText('Japan')).toBeInTheDocument()
  expect(screen.getByText('Iceland')).toBeInTheDocument()
})
