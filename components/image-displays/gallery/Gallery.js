import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useIsMobile } from "../../../common/useIsMobile";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";
import PhotoLightbox from "../PhotoLightbox";
import { getImageRefUrl, normalizeImageRefs } from "../../../common/assetRefs";
import ContactDisplay from "components/contact/ContactDisplay";
import { PrintStoreProvider } from "../print/PrintStoreContext";
import { resolveVariant, resolveAlign, resolveFont, resolveButtonStyle, resolveSize, resolvePhotoSize, resolveQuoteStyle } from "../../../common/themes/variants";
import { getBlockSpec } from "../../../common/themes";
import { resolveCaptionStyle, captionStyleCss } from "../../../common/captionStyles";
import { resolveSubNavStyle } from '../../../common/siteDesign';
import ManhattanGrid from "../themes/manhattan/ManhattanGrid";
import GridGallery from "./grid-gallery/GridGallery";
import SquareGallery from "./square-gallery/SquareGallery";
import FramedPhoto from "./photo-block/FramedPhoto";
import ManhattanPhoto from "./photo-block/ManhattanPhoto";
import FlorenceWall from "../themes/florence/FlorenceWall";
import AmsterdamWall from "../themes/amsterdam/AmsterdamWall";
import PageGalleryLinks from "./page-gallery/PageGalleryLinks";
import MarkdownText from "@/components/image-displays/MarkdownText";

// Varying heights per column slot to mimic natural photo proportions
const PLACEHOLDER_ASPECTS = [
  'aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/3]',
  'aspect-[3/4]', 'aspect-[4/3]', 'aspect-[3/4]',
]

// Per-layout size scales. Larger images = fewer columns / wider single image.
// Defaults (see resolvePhotoSize) keep existing galleries unchanged: masonry &
// stacked → large, square & grid → medium.
const MASONRY_COLS = { small: 4, medium: 3, large: 2 }
const SQUARE_COLS = { small: 4, medium: 3, large: 2 }
const GRID_BASIS = { small: 160, medium: 220, large: 300 }
const STACKED_PCT = { small: 44, medium: 56, large: 72 }
const PHOTO_CENTERED_PCT = { small: 44, medium: 56, large: 72 }
const sizeKey = (s) => (s === 'small' || s === 'medium' || s === 'large' ? s : 'large')

// Manhattan empty-state palette — cool neutral, not the warm Kyoto tones.
const MH_TILE = '#ececec'
const MH_ICON = '#c4c4c4'
const MH_BLOB = '#e6e6e6'

function PlaceholderIcon({ color = '#d3c6b2' }) {
  return (
    <svg className="w-10 h-10" style={{ color }} viewBox="0 0 48 48" fill="none">
      <rect x="4" y="10" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="33" cy="18" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 32 l10-10 a2 2 0 0 1 2.8 0l8 8 a2 2 0 0 0 2.8 0l4-4 a2 2 0 0 1 2.8 0L44 34" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function PlaceholderTile({ aspectClass = 'aspect-[4/3]', square = false, bg = '#ede7dc', iconColor }) {
  return (
    <div className={`${aspectClass} w-full ${square ? '' : 'rounded-3xl'} flex items-center justify-center select-none mb-5`} style={{ background: bg }}>
      <PlaceholderIcon color={iconColor} />
    </div>
  )
}

// Per-theme look for the mobile placeholder tiles, so an empty block previews the
// same corners/tint the real image gets on a phone (Copenhagen/Provence square
// with Copenhagen's cooler tile; Kyoto warm + rounded).
function mobilePlaceholderSkin(themeId) {
  const mh = themeId === 'manhattan'
  return { square: mh || themeId === 'provence', bg: mh ? MH_TILE : '#ede7dc', iconColor: mh ? MH_ICON : undefined }
}

// The empty-state preview shown on the right. It mirrors the block's chosen
// layout so the photographer sees what a photos block will look like before
// adding any images.
function PlaceholderGrid({ variant = 'masonry', size = 'large', themeId = 'kyoto', mobile = false }) {
  const sz = sizeKey(size)
  if (mobile) {
    // Mobile preview: every layout collapses to a single stacked column of
    // uniform full-width tiles (10px side margin) — matches the real mobile render,
    // including the theme's corners/tint.
    const skin = mobilePlaceholderSkin(themeId)
    return (
      <div className="w-full px-[10px]" data-photos-placeholder="mobile">
        {[0, 1, 2].map((i) => <PlaceholderTile key={i} aspectClass="aspect-[3/2]" {...skin} />)}
      </div>
    )
  }
  if (themeId === 'manhattan') {
    // Mirror the Manhattan gallery-wall: full-width, sharp-cornered masonry
    // columns (via the .manhattan-grid CSS), icon centered in each tile.
    return (
      <div className="manhattan-grid" style={{ columnGap: '1rem' }} data-photos-placeholder="manhattan">
        {PLACEHOLDER_ASPECTS.map((aspect, i) => (
          <div key={i} className="mb-4" style={{ breakInside: 'avoid' }}>
            <div className={`${aspect} w-full flex items-center justify-center select-none`} style={{ background: MH_TILE }}>
              <PlaceholderIcon color={MH_ICON} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (variant === 'stacked') {
    return (
      <div className="w-full mx-auto p-4 md:p-8" style={{ maxWidth: `${STACKED_PCT[sz] + 12}%` }} data-photos-placeholder="stacked">
        <PlaceholderTile aspectClass="aspect-[3/2]" />
        <div className="flex gap-5">
          <div className="flex-1"><PlaceholderTile aspectClass="aspect-[3/4]" /></div>
          <div className="flex-1"><PlaceholderTile aspectClass="aspect-[3/4]" /></div>
        </div>
      </div>
    )
  }
  if (variant === 'square') {
    const cols = SQUARE_COLS[sz]
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-8" data-photos-placeholder="square">
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols * 2 }).map((_, i) => <PlaceholderTile key={i} aspectClass="aspect-square" />)}
        </div>
      </div>
    )
  }
  if (variant === 'grid') {
    // Justified row: equal height, widths vary by aspect (portraits narrower).
    const ratios = [1.5, 0.7, 1.2, 1.0]
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8" data-photos-placeholder="grid">
        <div className="flex gap-5" style={{ height: sz === 'large' ? 260 : sz === 'small' ? 150 : 200 }}>
          {ratios.map((ar, i) => (
            <div key={i} className="h-full rounded-3xl flex items-center justify-center select-none" style={{ background: '#ede7dc', flexGrow: ar, flexBasis: 0 }}>
              <PlaceholderIcon />
            </div>
          ))}
        </div>
      </div>
    )
  }
  // masonry (default)
  const cols = MASONRY_COLS[sz]
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8" data-photos-placeholder="masonry">
      <div style={{ columnCount: cols, columnGap: '1.25rem' }}>
        {PLACEHOLDER_ASPECTS.map((aspect, i) => (
          <div key={i} style={{ breakInside: 'avoid' }}>
            <PlaceholderTile aspectClass={aspect} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Empty-state preview for a single photo block. Mirrors PhotoBlock's variants:
// full-bleed spans the content width with square corners, centered is a narrower
// rounded tile scaled by size, side puts the image next to a caption column.
function PlaceholderPhoto({ variant = 'full-bleed', size = 'large', themeId = 'kyoto', mobile = false }) {
  const sz = sizeKey(size)
  if (mobile) {
    // Mobile preview: mirror the real photo. Full-bleed spans edge-to-edge (no
    // margin, square); everything else is a uniform 10px-margin tile. Corners and
    // tint follow the theme.
    const skin = mobilePlaceholderSkin(themeId)
    if (variant === 'full-bleed' || themeId === 'manhattan') {
      return (
        <div className="w-full" data-photo-placeholder="mobile-bleed">
          <div className="w-full aspect-[3/2] flex items-center justify-center select-none" style={{ background: skin.bg }}>
            <PlaceholderIcon color={skin.iconColor} />
          </div>
        </div>
      )
    }
    return (
      <div className="w-full px-[10px]" data-photo-placeholder="mobile">
        <PlaceholderTile aspectClass="aspect-[3/2]" {...skin} />
      </div>
    )
  }
  if (themeId === 'manhattan') {
    // Manhattan single photo spans the full content width, sharp corners.
    return (
      <div className="w-full" data-photo-placeholder="manhattan">
        <div className="w-full aspect-[3/2] flex items-center justify-center select-none" style={{ background: MH_TILE }}>
          <PlaceholderIcon color={MH_ICON} />
        </div>
      </div>
    )
  }
  if (variant === 'side-by-side') {
    return (
      <div className="w-full md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6 px-4 md:px-0" data-photo-placeholder="side">
        <div className="w-full md:w-2/3"><PlaceholderTile aspectClass="aspect-[3/2]" /></div>
        <div className="w-full md:w-1/3 space-y-3">
          <div className="h-4 rounded-full w-3/4" style={{ background: '#ede7dc' }} />
          <div className="h-4 rounded-full w-1/2" style={{ background: '#ede7dc' }} />
        </div>
      </div>
    )
  }
  if (variant === 'centered') {
    return (
      <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: `${PHOTO_CENTERED_PCT[sz]}%` }} data-photo-placeholder="centered">
        <PlaceholderTile aspectClass="aspect-[3/2]" />
      </div>
    )
  }
  // full-bleed (default): span the content width at a normal landscape ratio
  // (same proportions a real image gets), square corners.
  return (
    <div className="w-full" data-photo-placeholder="full-bleed">
      <div className="w-full aspect-[3/2] flex items-center justify-center select-none" style={{ background: '#ede7dc' }}>
        <PlaceholderIcon />
      </div>
    </div>
  )
}

function PlaceholderText({ themeId = 'kyoto' }) {
  if (themeId === 'manhattan') {
    // Left-anchored, readable measure — matches Manhattan text blocks.
    return (
      <div className="max-w-2xl py-10 space-y-4">
        <div className="h-6 w-3/4" style={{ background: MH_BLOB }} />
        <div className="h-6 w-1/2" style={{ background: MH_BLOB }} />
        <div className="h-6 w-5/8" style={{ background: MH_BLOB }} />
      </div>
    )
  }
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-4">
      <div className="h-6 bg-stone-100 rounded-full w-3/4 mx-auto" />
      <div className="h-6 bg-stone-100 rounded-full w-1/2 mx-auto" />
      <div className="h-6 bg-stone-100 rounded-full w-5/8 mx-auto" />
    </div>
  )
}

// Empty-state preview for a video block. Mirrors VideoBlock's variant layouts
// (full-bleed / centered / side) and shows the caption, so design + caption
// changes are visible before a URL is entered. variant: 1 full-bleed, 2 centered, 3 side.
function PlaceholderVideo({ variant = 2, caption, captionStyle = 'sans', themeId = 'kyoto' }) {
  const capCss = captionStyleCss(captionStyle)
  const box = (
    <div className={`w-full aspect-[16/9] overflow-hidden select-none flex items-center justify-center ${variant === 1 || themeId === 'manhattan' ? 'rounded-none' : 'rounded-3xl'}`} style={{ background: themeId === 'manhattan' ? MH_TILE : '#ede7dc' }}>
      <svg className="w-14 h-14" style={{ color: themeId === 'manhattan' ? MH_ICON : '#d3c6b2' }} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 17 L33 24 L20 31 Z" fill="currentColor" />
      </svg>
    </div>
  )
  if (themeId === 'manhattan') {
    // Full content width, sharp corners, caption left-aligned — matches Manhattan.
    return (
      <div className="w-full">
        {box}
        {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left" style={capCss}>{caption}</p>}
      </div>
    )
  }
  if (variant === 3) {
    return (
      <div className="w-full md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-full md:w-2/3">{box}</div>
        <div className="w-full md:w-1/3 flex items-center">
          {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0" style={capCss}>{caption}</p>}
        </div>
      </div>
    )
  }
  const containerCls = variant === 1
    ? 'w-full mx-auto'
    : 'w-full md:w-[85%] mx-auto'
  return (
    <div className={containerCls}>
      {box}
      {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto" style={capCss}>{caption}</p>}
    </div>
  )
}

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, childPages, activeChildId, currentPageId, username, basePath, onBackClick, onSlideshowClick, onClientLoginClick, onChildPageClick, onPageClick, showPlaceholders, onBlockHover, onBlockClick, siteConfig, printStore, themeId = 'kyoto', hasCover = false, coverHeight = 'partial', coverButtonStyle = 'solid', cover = null, opener = 'title' }) => {
  const linkBase = basePath != null ? basePath : (username ? `/sites/${username}` : '')
  // Manhattan moves its section divider into the left rail (see SiteNav); the
  // body renders no between-section wiggles. Other themes keep them.
  const Wiggle = () => (themeId === 'manhattan' ? null : <WiggleLine />)
  // Caption style: the block's own choice, else the theme's default (Kyoto → serif).
  const capStyle = (block) => resolveCaptionStyle(block, getBlockSpec(themeId, block.type)?.defaultCaptionStyle)
  const isSmallScreen = useIsMobile()
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Build flat image list + per-block offsets
  const { allImages, blockOffsets } = useMemo(() => {
    const allImages = [];
    const blockOffsets = [];
    (blocks || []).forEach((block) => {
      blockOffsets.push(allImages.length);
      if (block.type === "photos" || block.type === "stacked" || block.type === "masonry") {
        const refs = normalizeImageRefs(block.images || block.imageUrls || []);
        allImages.push(...refs);
      } else if (block.type === "photo") {
        const url = getImageRefUrl(block.image || block.imageUrl);
        if (url) allImages.push({ url, caption: block.caption || "", ...(block.print ? { print: block.print } : {}) });
      }
    });
    return { allImages, blockOffsets };
  }, [blocks]);

  // Sync lightboxIndex from URL query
  useEffect(() => {
    const n = parseInt(router.query.photo, 10);
    if (!isNaN(n) && n >= 0 && n < allImages.length) {
      setLightboxIndex(n);
    } else {
      setLightboxIndex(null);
    }
  }, [router.query.photo, allImages.length]);

  // Keep the URL the visitor actually sees (e.g. the clean subdomain path
  // `swamiphoto.sepia.photo/portraits`) instead of letting Next regenerate it
  // from the internal `/sites/[username]/[slug]` route. Without an explicit
  // `as`, a shallow push rebuilds the bar from the route pattern and leaks the
  // rewritten `/sites/<username>/…` path that the middleware meant to hide.
  const currentPath = () => (typeof window !== "undefined" ? window.location.pathname : router.asPath.split("?")[0]);

  const openLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, `${currentPath()}?photo=${globalIndex}`, { shallow: true });
  };

  const closeLightbox = () => {
    const q = { ...router.query };
    delete q.photo;
    router.push({ query: q }, currentPath(), { shallow: true });
  };

  const navigateLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, `${currentPath()}?photo=${globalIndex}`, { shallow: true });
  };

  const makeClickHandler = (blockIdx) => (localIndex) => {
    openLightbox(blockOffsets[blockIdx] + localIndex);
  };

  // Provence and Manhattan both bleed imagery to the full content width so every
  // layout (masonry, stacked, square, grid) spans edge-to-edge. Provence keeps a
  // slim symmetric gutter via CSS; the Manhattan-only extras (inside captions,
  // left-anchoring) stay gated on manhattan alone.
  const bleedImages = themeId === 'manhattan' || themeId === 'provence'
  const isFlorence = themeId === 'florence'
  const isAmsterdam = themeId === 'amsterdam'
  // Florence photo treatment (design panel): colour default; mono/sepia tint the
  // gallery imagery via [data-theme="florence"] .gallery-container[data-photo-treatment].
  const photoTreatment = isFlorence ? (siteConfig?.design?.photoTreatment || 'colour') : undefined
  const suppressCover = hasCover || themeId === 'manhattan'

  // Florence is a bespoke, fixed-viewport horizontal museum wall: the rail, the
  // sliding menu column, the intro column and every block-column live in
  // FlorenceWall. It owns its own nav (SiteNav is suppressed for florence in the
  // page files), so short-circuit the vertical block flow entirely.
  if (isFlorence) {
    const florenceActions = []
    if (enableSlideshow) florenceActions.push({ label: 'View Music Show', onClick: onSlideshowClick })
    if (enableClientView) florenceActions.push({ label: 'Client Login', onClick: onClientLoginClick, style: 'outline' })
    return (
      <PrintStoreProvider printStore={printStore} username={username}>
        <div className="gallery-container" data-photo-treatment={photoTreatment}>
          <FlorenceWall
            siteConfig={siteConfig}
            name={name}
            description={description}
            blocks={blocks || []}
            basePath={linkBase}
            makeClickHandler={makeClickHandler}
            onBlockHover={onBlockHover}
            onBlockClick={onBlockClick}
            mobile={isSmallScreen}
            actions={florenceActions}
            currentPath={(router.asPath || '').split('?')[0]}
            photoMeta={siteConfig?.design?.florencePhotoMeta || 'date'}
            pages={pages}
            childPages={childPages}
            activeChildId={activeChildId}
            onChildPageClick={onChildPageClick}
            currentPageId={currentPageId}
            onPageClick={onPageClick || onChildPageClick}
            showPlaceholders={showPlaceholders}
          />
        </div>
        {lightboxIndex !== null && (
          <PhotoLightbox images={allImages} index={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} printStore={printStore} />
        )}
      </PrintStoreProvider>
    )
  }

  // Amsterdam is a bespoke, fixed-viewport horizontal poster wall: the rail, the
  // sliding ink menu, the opener column and every block-column live in
  // AmsterdamWall. It owns its own nav (SiteNav suppressed in the page files).
  if (isAmsterdam) {
    const amsActions = []
    if (enableSlideshow) amsActions.push({ label: 'View Music Show', onClick: onSlideshowClick })
    if (enableClientView) amsActions.push({ label: 'Client Login', onClick: onClientLoginClick, style: 'outline' })
    return (
      <PrintStoreProvider printStore={printStore} username={username}>
        <div className="gallery-container">
          <AmsterdamWall
            siteConfig={siteConfig}
            name={name}
            description={description}
            blocks={blocks || []}
            basePath={linkBase}
            makeClickHandler={makeClickHandler}
            onBlockHover={onBlockHover}
            onBlockClick={onBlockClick}
            mobile={isSmallScreen}
            actions={amsActions}
            currentPath={(router.asPath || '').split('?')[0]}
            photoMeta={siteConfig?.design?.amsterdamPhotoMeta || 'date'}
            pages={pages}
            childPages={childPages}
            activeChildId={activeChildId}
            onChildPageClick={onChildPageClick}
            currentPageId={currentPageId}
            onPageClick={onPageClick || onChildPageClick}
            cover={cover}
            opener={opener}
            showPlaceholders={showPlaceholders}
          />
        </div>
        {lightboxIndex !== null && (
          <PhotoLightbox images={allImages} index={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} printStore={printStore} />
        )}
      </PrintStoreProvider>
    )
  }

  return (
    <PrintStoreProvider printStore={printStore} username={username}>
    <div className="gallery-container" data-photo-treatment={photoTreatment}>
      <GalleryCover name={name} description={description} themeId={themeId} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} childPages={childPages} activeChildId={activeChildId} parentPage={(childPages && childPages.length && pages) ? pages.find(p => p.id === childPages[0].parentId) : null} username={username} basePath={basePath} onChildPageClick={onChildPageClick} showChildNav={resolveSubNavStyle(siteConfig?.design) === 'inline'} suppressCover={suppressCover} coverHeight={coverHeight} buttonStyle={coverButtonStyle} />

      <div className="space-y-10">
        {(blocks || []).map((block, index) => {
          const hoverProps = {
            ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
            ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
          };

          switch (block.type) {
            case "photos": {
              const variantId = resolveVariant(block, themeId)
              const size = sizeKey(resolvePhotoSize(block, themeId))
              const usemasonry = variantId === 'masonry' || isSmallScreen;
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant={variantId} size={size} themeId={themeId} mobile={isSmallScreen} /><Wiggle /></div> : null;
              if (variantId === 'grid' && !isSmallScreen) {
                return (
                  <div key={`block-${index}`} className="photos-grid-block" data-block-index={index} {...hoverProps}>
                    {themeId === 'manhattan'
                      ? <ManhattanGrid images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={capStyle(block)} />
                      : <GridGallery images={imageRefs} onImageClick={makeClickHandler(index)} basis={GRID_BASIS[size]} edgeToEdge={themeId === 'provence'} rounded={themeId !== 'provence'} />}
                  </div>
                );
              }
              if (variantId === 'square' && !isSmallScreen) {
                return (
                  <div key={`block-${index}`} className="photos-square-block" data-block-index={index} {...hoverProps}>
                    <SquareGallery images={imageRefs} onImageClick={makeClickHandler(index)} maxCols={SQUARE_COLS[size]} bleed={bleedImages} />
                  </div>
                );
              }
              return (
                <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}>
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : MASONRY_COLS[size]} mobile={isSmallScreen} captionStyle={capStyle(block)} insideCaption={themeId === 'manhattan'} bleed={bleedImages} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={capStyle(block)} widthPct={bleedImages ? 100 : STACKED_PCT[size]} insideCaption={themeId === 'manhattan'} leftAlign={themeId === 'manhattan'} />}
                  <Wiggle />
                </div>
              );
            }

            case "stacked": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="stacked-gallery-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant="stacked" themeId={themeId} mobile={isSmallScreen} /><Wiggle /></div> : null;
              return (
                <div key={`block-${index}`} className="stacked-gallery-block" data-block-index={index} {...hoverProps}>
                  {isSmallScreen
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={1} mobile captionStyle={capStyle(block)} insideCaption={themeId === 'manhattan'} bleed={bleedImages} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={capStyle(block)} widthPct={bleedImages ? 100 : undefined} insideCaption={themeId === 'manhattan'} leftAlign={themeId === 'manhattan'} />}
                  <Wiggle />
                </div>
              );
            }

            case "masonry": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="masonry-gallery-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant="masonry" themeId={themeId} mobile={isSmallScreen} /><Wiggle /></div> : null;
              return (
                <div key={`block-${index}`} className="masonry-gallery-block" data-block-index={index} {...hoverProps}>
                  <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : 2} mobile={isSmallScreen} captionStyle={capStyle(block)} insideCaption={themeId === 'manhattan'} bleed={bleedImages} />
                  <Wiggle />
                </div>
              );
            }

            case "text": {
              if (!block.content) return showPlaceholders ? <div key={`block-${index}`} data-block-index={index} {...hoverProps}><PlaceholderText themeId={themeId} /><Wiggle /></div> : null;
              const variantId = resolveVariant(block, themeId)
              const v = { heading: 1, subheading: 2, body: 3, quote: 4 }[variantId] || 1
              const align = resolveAlign(block, themeId)
              const alignClass = align === 'left' ? 'text-left' : 'text-center';
              // Font follows the block's chosen slot (Manhattan defaults to sans;
              // Serif/Editorial are selectable). Line-height tightened via CSS.
              const fontFamily = resolveFont(block, themeId);
              // A restrained, elegant size scale shared across the vertical themes.
              // Medium (vv 2) is the readable base; these serif/editorial themes read
              // best a touch larger than the wall themes, so the base is ~1.125rem
              // (~18px), Large one notch up, Small one notch down. Margins key off the
              // JS mobile flag so the admin Mobile preview scales truthfully.
              // (vv: 1=Large, 2=Medium, 3=Small, 4=quote.)
              const classForV = (vv) => themeId === 'manhattan'
                ? (
                    vv === 4 ? `text-[0.95rem] italic ${alignClass} max-w-2xl px-6 py-3 border-l-2 border-stone-300`
                    : vv === 3 ? `text-[0.95rem] ${alignClass} max-w-2xl py-2`
                    : vv === 2 ? `text-[1.125rem] font-medium ${alignClass} max-w-2xl py-3`
                    : `text-[1.375rem] font-light ${alignClass} max-w-3xl py-4`
                  )
                : (
                    vv === 4 ? `${isSmallScreen ? 'text-[1rem] px-6 py-4' : 'text-[1.05rem] px-8 py-5'} italic text-stone-600 leading-relaxed ${alignClass} max-w-2xl mx-auto border-l-2 border-stone-300`
                    : vv === 3 ? `${isSmallScreen ? 'text-[0.95rem] px-6 py-2' : 'text-[0.95rem] py-3'} text-stone-700 leading-relaxed ${alignClass} max-w-2xl mx-auto`
                    : vv === 2 ? `${isSmallScreen ? 'text-[1.125rem] px-6 py-3' : 'text-[1.125rem] py-4'} font-medium text-stone-700 ${alignClass} max-w-2xl mx-auto`
                    : `${isSmallScreen ? 'text-[1.25rem] px-6 py-5' : 'text-[1.375rem] py-6'} font-light leading-snug text-stone-800 ${alignClass} max-w-3xl mx-auto`
                  );
              const variantClass = classForV(v);
              if (block.format === 'markdown') {
                return (
                  <div className={`text-block ${alignClass}`} key={`block-${index}`} data-block-index={index} {...hoverProps} style={{ ...hoverProps.style, fontFamily }}>
                    <MarkdownText
                      content={block.content}
                      variantClasses={{ heading: classForV(1), body: classForV(v), quote: classForV(4) }}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={`block-${index}`}
                  className={`text-block ${variantClass}`}
                  data-block-index={index}
                  {...hoverProps}
                  style={{ ...hoverProps.style, fontFamily }}
                >
                  {block.content}
                </div>
              );
            }

            case "photo": {
              const variantId = resolveVariant(block, themeId)
              const size = sizeKey(resolvePhotoSize(block, themeId))
              if (!getImageRefUrl(block.image || block.imageUrl)) return showPlaceholders ? <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}><PlaceholderPhoto variant={variantId} size={size} themeId={themeId} mobile={isSmallScreen} /><Wiggle /></div> : null;
              if (themeId === 'manhattan') {
                return (
                  <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                    <ManhattanPhoto
                      imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                      caption={block.caption}
                      onImageClick={makeClickHandler(index)}
                      captionStyle={capStyle(block)}
                      print={block.print}
                    />
                  </div>
                );
              }
              const photoVariant = { centered: 2, 'side-by-side': 3 }[variantId] || 1
              return (
                <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                  <PhotoBlock
                    imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                    caption={block.caption}
                    variant={photoVariant}
                    widthPct={PHOTO_CENTERED_PCT[size]}
                    onImageClick={makeClickHandler(index)}
                    print={block.print}
                    captionStyle={capStyle(block)}
                  />
                  <Wiggle />
                </div>
              );
            }

            case "video": {
              const variantId = resolveVariant(block, themeId)
              const videoVariant = { 'full-bleed': 1, centered: 2, 'side-by-side': 3 }[variantId] || 2
              if (!(block.url || '').trim()) return showPlaceholders ? <div key={`block-${index}`} className="video-block" data-block-index={index} {...hoverProps}><PlaceholderVideo variant={videoVariant} caption={block.caption} captionStyle={capStyle(block)} themeId={themeId} /><Wiggle /></div> : null;
              return (
                <div key={`block-${index}`} className="video-block" data-block-index={index} {...hoverProps}>
                  <VideoBlock url={block.url} caption={block.caption} variant={videoVariant} captionStyle={capStyle(block)} bleed={themeId === 'manhattan'} />
                  <Wiggle />
                </div>
              );
            }

            case "page-gallery": {
              const linkedPages = (block.pageIds || [])
                .map(id => (pages || []).find(p => p.id === id))
                .filter(Boolean);
              if (linkedPages.length === 0) return null;
              const variantId = resolveVariant(block, themeId);
              return (
                <div key={`block-${index}`} className="page-gallery-block" data-block-index={index} {...hoverProps}>
                  <PageGalleryLinks pages={linkedPages} variant={variantId} imageSide={block.imageSide} size={resolveSize(block, themeId)} linkBase={linkBase} onChildPageClick={onChildPageClick} manhattan={themeId === 'manhattan'} />
                </div>
              );
            }

            case "testimonial": {
              const photoUrl = getImageRefUrl(block.image || block.imageUrl)
              const v = resolveVariant(block, themeId) === 'quote-above' ? 2 : 1
              const manhattan = themeId === 'manhattan'
              const FR = '"Fraunces", Georgia, serif'

              if (!block.text && !block.name && !photoUrl) {
                if (!showPlaceholders) return null
                if (manhattan) {
                  const mBlobAvatar = <div style={{ width: 38, height: 38, background: MH_TILE, flexShrink: 0 }} />
                  const mBlobName = <div style={{ height: 9, borderRadius: 4, background: MH_BLOB, width: '5rem' }} />
                  const mBlobBars = (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '32rem' }}>
                      <div style={{ height: 8, borderRadius: 4, background: MH_BLOB, width: '90%' }} />
                      <div style={{ height: 8, borderRadius: 4, background: MH_BLOB, width: '74%' }} />
                      <div style={{ height: 8, borderRadius: 4, background: MH_BLOB, width: '55%' }} />
                    </div>
                  )
                  return (
                    <div key={`block-${index}`} className="testimonial-block" data-block-index={index} data-testimonial-placeholder {...hoverProps}>
                      <figure style={{ maxWidth: '40rem', margin: 0, padding: '1.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.9rem' }}>
                        {mBlobBars}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>{mBlobAvatar}{mBlobName}</div>
                      </figure>
                      <Wiggle />
                    </div>
                  )
                }
                const avatarBlob = <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ede7dc, #d9cebd)', flexShrink: 0 }} />
                const barsBlob = (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '28rem', alignItems: 'center' }}>
                    <div style={{ height: 10, borderRadius: 4, background: '#e8e0d0', width: '88%', margin: '0 auto' }} />
                    <div style={{ height: 10, borderRadius: 4, background: '#e8e0d0', width: '72%', margin: '0 auto' }} />
                    <div style={{ height: 10, borderRadius: 4, background: '#e8e0d0', width: '56%', margin: '0 auto' }} />
                    <div style={{ height: 9, borderRadius: 4, background: '#e0d8c8', width: '6rem', marginTop: 4 }} />
                  </div>
                )
                return (
                  <div key={`block-${index}`} className="testimonial-block" data-block-index={index} data-testimonial-placeholder data-order={v === 2 ? 'photo-last' : 'photo-first'} {...hoverProps}>
                    <figure style={{ maxWidth: '36rem', margin: '0 auto', padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                      {v === 2 ? <>{barsBlob}{avatarBlob}</> : <>{avatarBlob}{barsBlob}</>}
                    </figure>
                    <Wiggle />
                  </div>
                )
              }

              const avatar = photoUrl && (
                <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,18,10,0.12)' }}>
                  <img src={photoUrl} alt={block.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )
              // Quote font follows the block's chosen slot (default serif); size
              // steps the font size down and tightens line-height progressively.
              const tFont = resolveFont(block, themeId)
              const tScale = {
                large:  { fs: 'clamp(1.25rem, 2.5vw, 1.6rem)', lh: 1.65 },
                medium: { fs: 'clamp(1.05rem, 2vw, 1.3rem)',   lh: 1.5 },
                small:  { fs: 'clamp(0.95rem, 1.5vw, 1.1rem)', lh: 1.4 },
              }[resolveSize(block, themeId)] || { fs: 'clamp(1.25rem, 2.5vw, 1.6rem)', lh: 1.65 }
              const quote = block.text && (
                <blockquote style={{ fontFamily: tFont, fontSize: tScale.fs, fontStyle: resolveQuoteStyle(block, themeId) === 'regular' ? 'normal' : 'italic', fontWeight: 400, color: '#2c2416', lineHeight: tScale.lh, margin: 0, padding: 0 }}>
                  &#8220;{block.text}&#8221;
                </blockquote>
              )
              const byline = block.name && (
                <div style={{ fontFamily: FR, fontSize: '1rem', fontWeight: 400, color: '#7a6b55', letterSpacing: '0.03em' }}>
                  — {block.name}
                </div>
              )

              if (manhattan) {
                // Fixed layout: quote, then square photo, then name below it.
                // Left-aligned, sans-serif, small, tight line-height. The quote's
                // italic/regular style is chosen in the editor (block.quoteStyle).
                const italic = resolveQuoteStyle(block, themeId) !== 'regular'
                const mFont = resolveFont(block, themeId)
                const mAvatar = photoUrl && (
                  <div style={{ width: 38, height: 38, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={photoUrl} alt={block.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )
                const mQuote = block.text && (
                  <blockquote style={{ fontFamily: mFont, fontSize: '0.9rem', fontStyle: italic ? 'italic' : 'normal', fontWeight: 400, color: 'var(--theme-text, #141414)', lineHeight: 1.55, margin: 0, padding: 0 }}>
                    {block.text}
                  </blockquote>
                )
                const mByline = block.name && (
                  <div style={{ fontFamily: mFont, fontSize: '0.8rem', fontWeight: 500, color: 'var(--theme-text-muted, #6b6b6b)' }}>
                    {block.name}
                  </div>
                )
                return (
                  <div key={`block-${index}`} className="testimonial-block" data-block-index={index} {...hoverProps}>
                    <figure style={{ maxWidth: '40rem', margin: 0, padding: '1.25rem 0', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.9rem' }}>
                      {mQuote}
                      {(photoUrl || block.name) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {mAvatar}
                          {mByline}
                        </div>
                      )}
                    </figure>
                    <Wiggle />
                  </div>
                )
              }

              return (
                <div key={`block-${index}`} className="testimonial-block" data-block-index={index} {...hoverProps}>
                  <figure style={{ maxWidth: '40rem', margin: '0 auto', padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    {v === 1 ? <>
                      {avatar}
                      {byline}
                      {quote}
                    </> : <>
                      {quote}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        {avatar}
                        {byline}
                      </div>
                    </>}
                  </figure>
                  <Wiggle />
                </div>
              )
            }

            case "contact": {
              return (
                <div key={`block-${index}`} className="contact-block-wrap" data-block-index={index} {...hoverProps}>
                  <ContactDisplay
                    heading={block.heading}
                    subheading={block.subheading}
                    buttonText={block.buttonText}
                    toEmail={siteConfig?.contact?.email}
                    align={resolveAlign(block, themeId)}
                    buttonStyle={resolveButtonStyle(block, themeId)}
                  />
                </div>
              );
            }

            default:
              console.error(`Unsupported block type: ${block.type}`);
              return null;
          }
        })}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={allImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          printStore={printStore}
        />
      )}
    </div>
    </PrintStoreProvider>
  );
};

export default Gallery;
