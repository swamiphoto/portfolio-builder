import { render, fireEvent } from '@testing-library/react'
import { useState } from 'react'

// Keep assetRefs REAL to reproduce the actual bug. Mock only the environment.
jest.mock('../../common/dragContext', () => ({
  useDrag: () => ({ startDrag: jest.fn(), endDrag: jest.fn(), drag: null, dropTargetPageId: null, setDropTargetPageId: jest.fn() }),
  DragProvider: ({ children }) => children,
}))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }))
jest.mock('../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))
// Minimal @hello-pangea/dnd — pass render props straight through.
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}))

const BlockBuilder = require('../../components/admin/gallery-builder/BlockBuilder').default
const { normalizeImageRefs } = require('../../common/assetRefs')

function makeDT() {
  const store = {}
  return { setData: (t, v) => { store[t] = v }, getData: (t) => store[t] || '', effectAllowed: '', setDragImage: () => {} }
}

// Mimic PageEditorSidebar: page → gallery → onChange(value, with closure page) → page.
function pageToGallery(page) {
  return { name: page.title, slug: page.id, description: '', blocks: page.blocks || [] }
}
function galleryToPage(page, gallery) {
  return { ...page, title: gallery.name || page.title, blocks: gallery.blocks || [] }
}

function Harness({ onPage, blocks }) {
  const [page, setPage] = useState({ id: 'p1', title: 'P', blocks })
  onPage(page)
  const gallery = pageToGallery(page)
  // value-based onChange with closure `page` — the real handleGalleryChange pattern
  return <BlockBuilder gallery={gallery} onChange={(g) => setPage(galleryToPage(page, g))} pages={[]} />
}

const MASONRY_PAIR = [
  { type: 'masonry', images: [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }] }, // source idx 0
  { type: 'masonry', images: [{ url: 'z.jpg' }] },                                       // target idx 1
]

// Reproduces the real bug: the target block is created FIRST (while the source
// is empty), then photos are added to the source. Because BlockCard is memoized
// and ignores the callback props, the target keeps a stale closure over the
// old (empty-source) gallery — so dropping onto it wipes the source.
function StaleHarness({ onPage }) {
  const [page, setPage] = useState({
    id: 'p1', title: 'P',
    blocks: [
      { type: 'masonry', images: [] },  // source starts EMPTY
      { type: 'photo', imageUrl: '' },  // target photo block
    ],
  })
  onPage(page)
  const gallery = pageToGallery(page)
  const addThreePhotos = () => setPage((p) => {
    const blocks = [...p.blocks]
    blocks[0] = { ...blocks[0], images: [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }], imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] }
    return { ...p, blocks }
  })
  return (
    <>
      <button data-testid="add3" onClick={addThreePhotos}>add</button>
      <BlockBuilder gallery={gallery} onChange={(g) => setPage((p) => galleryToPage(p, g))} pages={[]} />
    </>
  )
}

test('REPRO(stale-memo): add photos AFTER the target renders, then drag one -> source must keep the other two', () => {
  let latest
  const { container, getByTestId } = render(<StaleHarness onPage={(p) => { latest = p }} />)
  // add the 3 photos to the source AFTER first render (target does NOT re-render — memo)
  fireEvent.click(getByTestId('add3'))
  const sourceThumb = container.querySelectorAll('.grid')[0].querySelector('[draggable="true"]')
  const dropZone = [...container.querySelectorAll('span')].find(s => s.textContent === 'Drag a photo here')
  const dt = makeDT()
  fireEvent.dragStart(sourceThumb, { dataTransfer: dt })
  fireEvent.drop(dropZone, { dataTransfer: dt })
  const srcUrls = normalizeImageRefs(latest.blocks[0].images || latest.blocks[0].imageUrls || []).map((r) => r.url)
  expect(srcUrls).toEqual(['b.jpg', 'c.jpg'])       // must NOT be wiped
  expect(latest.blocks[1].imageUrl).toBe('a.jpg')   // moved photo landed
})

test('real BlockBuilder: cross-block photo drag keeps the rest of the source block', () => {
  let latest
  const { container } = render(<Harness blocks={MASONRY_PAIR} onPage={(p) => { latest = p }} />)

  const grids = container.querySelectorAll('.grid')
  expect(grids.length).toBe(2)
  const sourceThumb = grids[0].querySelector('[draggable="true"]')
  expect(sourceThumb).toBeTruthy()

  const dt = makeDT()
  fireEvent.dragStart(sourceThumb, { dataTransfer: dt })
  const payload = JSON.parse(dt.getData('application/x-photo-drag'))
  fireEvent.drop(grids[1], { dataTransfer: dt })

  const srcUrls = normalizeImageRefs(latest.blocks[0].images || latest.blocks[0].imageUrls || []).map((r) => r.url)
  const tgtUrls = normalizeImageRefs(latest.blocks[1].images || latest.blocks[1].imageUrls || []).map((r) => r.url)
  expect(payload.imageRefs.length).toBe(1)      // an unselected single-photo drag carries exactly one
  expect(srcUrls).toEqual(['b.jpg', 'c.jpg'])
  expect(tgtUrls).toContain('a.jpg')
})

test('REPRO: photos(3) -> single photo block, drag ONE, source should keep the other two', () => {
  let latest
  const { container } = render(<Harness onPage={(p) => { latest = p }} blocks={[
    { type: 'masonry', images: [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }] }, // source idx 0
    { type: 'photo', imageUrl: '' },                                                       // single photo target idx 1
  ]} />)
  const sourceThumb = container.querySelectorAll('.grid')[0].querySelector('[draggable="true"]')
  // innermost element so the synthetic drop bubbles UP into the photo block's onDrop
  const dropZone = [...container.querySelectorAll('span')].find(s => s.textContent === 'Drag a photo here')
  expect(dropZone).toBeTruthy()
  const dt = makeDT()
  fireEvent.dragStart(sourceThumb, { dataTransfer: dt })
  fireEvent.drop(dropZone, { dataTransfer: dt })
  const srcUrls = normalizeImageRefs(latest.blocks[0].images || latest.blocks[0].imageUrls || []).map((r) => r.url)
  const tgt = latest.blocks[1]
  expect(srcUrls).toEqual(['b.jpg', 'c.jpg'])
  expect(tgt.imageUrl).toBe('a.jpg')
})

test('with multiple photos selected, dragging one carries ALL selected out of the source', () => {
  let latest
  const { container } = render(<Harness blocks={MASONRY_PAIR} onPage={(p) => { latest = p }} />)
  const grids = container.querySelectorAll('.grid')
  const thumbs = grids[0].querySelectorAll('[draggable="true"]')
  // cmd-click two thumbs to multi-select, then drag one of them
  fireEvent.click(thumbs[0], { metaKey: true })
  fireEvent.click(thumbs[1], { metaKey: true })
  const dt = makeDT()
  fireEvent.dragStart(thumbs[0], { dataTransfer: dt })
  const payload = JSON.parse(dt.getData('application/x-photo-drag'))
  fireEvent.drop(grids[1], { dataTransfer: dt })
  const srcUrls = normalizeImageRefs(latest.blocks[0].images || []).map((r) => r.url)
  // two were selected → both leave the source (this is the "all disappear" path)
  expect(payload.imageRefs.length).toBe(2)
  expect(srcUrls).toEqual(['c.jpg'])
})
