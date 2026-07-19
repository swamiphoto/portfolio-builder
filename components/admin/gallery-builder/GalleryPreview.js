import { useState, useEffect, useMemo } from "react";
import Gallery from "../../image-displays/gallery/Gallery";
import { resolveCaption } from '../../../common/captionResolver'
import ThemeProvider from '../../image-displays/ThemeProvider'
import { useEditorFeedback } from './EditorFeedbackContext'
import { ReviewFeedbackProvider } from '../../image-displays/engagement/ClientEngagementContext'

function printForUrl(assetsByUrl, url) {
  const p = assetsByUrl?.[url]?.print
  return p && p.sellable ? p : undefined
}

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    const out = { ...block, caption: resolveCaption(ref, assetsByUrl) }
    const print = printForUrl(assetsByUrl, block.imageUrl)
    if (print) out.print = print
    return out
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => {
      const out = { ...r, caption: resolveCaption(r, assetsByUrl) }
      const print = printForUrl(assetsByUrl, r.url)
      if (print) out.print = print
      return out
    })
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}

export default function GalleryPreview({ gallery, pages, childPages, activeChildId, username, assetsByUrl, printStore, noWrap = false, enableSlideshow = false, onSlideshowClick, onChildPageClick, highlightedBlockIndex, onBlockHover, onBlockClick, siteConfig, hasCover = false, coverHeight = 'partial', coverButtonStyle = 'solid' }) {
  const feedbackCtx = useEditorFeedback()

  // Debounce the preview so a heavy re-render doesn't fire on every keystroke.
  // This only resets while the `gallery` prop keeps changing (i.e. while typing);
  // the parent (PagePreview) is memoized so unrelated re-renders, like autosave
  // status changes, don't reach here and can't starve the timer.
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 250);
    return () => clearTimeout(timer);
  }, [gallery]);

  // A focal-point drag (square-layout reposition) should update the preview LIVE,
  // not 250ms after the mouse is released. Repositioning changes a block image's
  // focalPoint on every pointer move, which otherwise keeps resetting the debounce
  // timer above. When any image focal point changes, flush the preview immediately;
  // typing/other edits stay debounced. Mirrors the page-thumbnail reposition path.
  const blockFocalSig = useMemo(
    () => (gallery.blocks || [])
      .map(b => (b.images || []).map(im => im?.focalPoint ? `${im.focalPoint.x},${im.focalPoint.y}` : '').join(';'))
      .join('|'),
    [gallery]
  );
  useEffect(() => {
    setDebouncedGallery(gallery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockFocalSig]);

  // Adding or removing a block is a discrete action (not per-keystroke typing), so
  // flush it to the preview immediately — this makes a new block's placeholder appear
  // at once so the editor can scroll to it, instead of after the 250ms debounce.
  const blockCount = (gallery.blocks || []).length;
  useEffect(() => {
    setDebouncedGallery(gallery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockCount]);

  const themeId = siteConfig?.design?.theme || 'kyoto';

  const resolvedBlocks = useMemo(
    () => (debouncedGallery.blocks || []).map(b => resolveBlock(b, assetsByUrl)),
    [debouncedGallery, assetsByUrl]
  );

  // Page-gallery blocks render thumbnails of *other* pages, so their crop/focal
  // point lives in `pages`, not in this gallery's own blocks. `inner` is memoized
  // without `pages` (it changes every keystroke — the edited page lives in it — and
  // would defeat the debounce). Instead track a cheap signature of just the thumbnail
  // + focal data: it changes on reposition but is stable while typing, so live
  // repositioning updates the preview immediately without thrashing per keystroke.
  const pagesThumbSig = useMemo(
    () => (pages || []).map(p => {
      const t = p.thumbnail;
      const fp = t?.focalPoint;
      return `${p.id}:${t?.imageUrl || ''}:${t?.useCover ? 1 : 0}:${fp ? `${fp.x},${fp.y}` : ''}`;
    }).join('|'),
    [pages]
  );

  // The inline sub-nav (child links under the cover) also lives inside the memoized
  // <Gallery> and reads its style + child pages from siteConfig/props, not from the
  // edited gallery's blocks. Track a signature so switching sub-nav variant, or
  // adding/renaming/reordering child pages, refreshes the preview live — otherwise
  // the memo keeps a stale copy and variant 2's links never appear.
  const childNavSig = useMemo(
    () => `${siteConfig?.design?.subNavStyle || 'dropdown'}|${activeChildId || ''}|` +
      (childPages || []).map(p => `${p.id}:${p.title || ''}`).join(','),
    [siteConfig?.design?.subNavStyle, activeChildId, childPages]
  );

  // The heavy part: drawing every block/image. Memoize it on the DEBOUNCED
  // content so per-keystroke re-renders of the parent (hero title/description,
  // hover, autosave status) reuse this exact element and React skips re-running
  // it entirely. Without this, on a photo-dense page the block render re-executes
  // on every keystroke and blocks the same commit that should paint the edit, so
  // nothing appears to update. It recomputes 250ms after the last edit, when
  // debouncedGallery updates. Non-content props (siteConfig/pages/highlight) are
  // read from the closure and are at most ~250ms stale, which is imperceptible.
  const inner = useMemo(() => (
    <ThemeProvider themeId={themeId}>
      <Gallery
        name={debouncedGallery.name}
        description={debouncedGallery.description}
        blocks={resolvedBlocks}
        enableSlideshow={enableSlideshow}
        pages={pages}
        childPages={childPages}
        activeChildId={activeChildId}
        username={username}
        onChildPageClick={onChildPageClick}
        showPlaceholders
        onBackClick={() => {}}
        onSlideshowClick={onSlideshowClick || (() => {})}
        onClientLoginClick={() => {}}
        highlightedBlockIndex={highlightedBlockIndex}
        onBlockHover={onBlockHover}
        onBlockClick={onBlockClick}
        siteConfig={siteConfig}
        printStore={printStore}
        themeId={themeId}
        hasCover={hasCover}
        coverHeight={coverHeight}
        coverButtonStyle={coverButtonStyle}
      />
    </ThemeProvider>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [debouncedGallery, resolvedBlocks, themeId, printStore, pagesThumbSig, childNavSig, hasCover, coverHeight, coverButtonStyle]);

  const content = (feedbackCtx?.showFeedback && feedbackCtx.hasFeedback)
    ? <ReviewFeedbackProvider feedbackByPhoto={feedbackCtx.feedbackByPhoto} onOpenPhoto={feedbackCtx.openPhoto}>{inner}</ReviewFeedbackProvider>
    : inner

  if (noWrap) return content;

  return (
    <div className="flex-1 h-full min-w-0 overflow-y-auto [overflow-x:clip] bg-white">
      {content}
    </div>
  );
}
