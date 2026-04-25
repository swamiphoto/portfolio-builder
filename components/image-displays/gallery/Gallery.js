import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import { useAdminViewport } from '../../../contexts/ViewportContext';
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";
import PhotoLightbox from "../PhotoLightbox";
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail } from "../../../common/assetRefs";

// Varying heights per column slot to mimic natural photo proportions
const PLACEHOLDER_ASPECTS = [
  'aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/3]',
  'aspect-[3/4]', 'aspect-[4/3]', 'aspect-[3/4]',
]

function PlaceholderTile({ aspectClass = 'aspect-[4/3]' }) {
  return (
    <div className={`${aspectClass} w-full rounded-3xl shadow-md bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center select-none mb-5`}>
      <svg className="w-10 h-10 text-stone-300" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="10" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="33" cy="18" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 32 l10-10 a2 2 0 0 1 2.8 0l8 8 a2 2 0 0 0 2.8 0l4-4 a2 2 0 0 1 2.8 0L44 34" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PlaceholderGrid({ count = 6 }) {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div style={{ columnCount: 3, columnGap: '1.25rem' }}>
        {PLACEHOLDER_ASPECTS.slice(0, count).map((aspect, i) => (
          <div key={i} style={{ breakInside: 'avoid' }}>
            <PlaceholderTile aspectClass={aspect} />
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaceholderPhoto() {
  return (
    <div className="mx-auto max-w-3xl w-full px-4 md:px-8">
      <PlaceholderTile aspectClass="aspect-[3/2]" />
    </div>
  )
}

function PlaceholderText() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-4">
      <div className="h-6 bg-stone-100 rounded-full w-3/4 mx-auto" />
      <div className="h-6 bg-stone-100 rounded-full w-1/2 mx-auto" />
      <div className="h-6 bg-stone-100 rounded-full w-5/8 mx-auto" />
    </div>
  )
}

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, childPages, activeChildId, username, onBackClick, onSlideshowClick, onClientLoginClick, onChildPageClick, showPlaceholders, onBlockHover }) => {
  const adminViewport = useAdminViewport()
  const mediaSmall = useMediaQuery({ query: "(max-width: 768px)" })
  const isSmallScreen = adminViewport != null ? adminViewport === 'mobile' : mediaSmall
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
        if (url) allImages.push({ url, caption: block.caption || "" });
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

  const openLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, undefined, { shallow: true });
  };

  const closeLightbox = () => {
    const q = { ...router.query };
    delete q.photo;
    router.push({ query: q }, undefined, { shallow: true });
  };

  const navigateLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, undefined, { shallow: true });
  };

  const makeClickHandler = (blockIdx) => (localIndex) => {
    openLightbox(blockOffsets[blockIdx] + localIndex);
  };

  return (
    <div className="gallery-container">
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} childPages={childPages} activeChildId={activeChildId} username={username} onChildPageClick={onChildPageClick} />

      <div className="space-y-10">
        {(blocks || []).map((block, index) => {
          const hoverProps = onBlockHover ? {
            onMouseEnter: () => onBlockHover(index),
            onMouseLeave: () => onBlockHover(null),
          } : {};

          switch (block.type) {
            case "photos": {
              const usemasonry = block.layout === "masonry" || isSmallScreen;
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="photos-block"><PlaceholderGrid /><WiggleLine /></div> : null;
              return (
                <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}>
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : 2} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="stacked-gallery-block"><PlaceholderGrid /><WiggleLine /></div> : null;
              return (
                <div key={`block-${index}`} className="stacked-gallery-block" data-block-index={index} {...hoverProps}>
                  {isSmallScreen
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={1} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "masonry": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="masonry-gallery-block"><PlaceholderGrid /><WiggleLine /></div> : null;
              return (
                <div key={`block-${index}`} className="masonry-gallery-block" data-block-index={index} {...hoverProps}>
                  <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : 2} />
                  <WiggleLine />
                </div>
              );
            }

            case "text":
              if (!block.content) return showPlaceholders ? <div key={`block-${index}`}><PlaceholderText /><WiggleLine /></div> : null;
              return (
                <div
                  key={`block-${index}`}
                  className={`text-block text-center text-2xl md:text-4xl text-gray-800 max-w-3xl mx-auto py-10 ${block.variant === 2 ? "font-serif2" : ""}`}
                  data-block-index={index}
                 
                  {...hoverProps}
                >
                  {block.content}
                </div>
              );

            case "photo": {
              if (!getImageRefUrl(block.image || block.imageUrl)) return showPlaceholders ? <div key={`block-${index}`} className="photo-block"><PlaceholderPhoto /><WiggleLine /></div> : null;
              const photoVariant = block.layout === "Centered" ? 2 : (block.variant || 1);
              return (
                <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                  <PhotoBlock
                    imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                    caption={block.caption}
                    variant={photoVariant}
                    onImageClick={makeClickHandler(index)}
                  />
                  <WiggleLine />
                </div>
              );
            }

            case "video": {
              const videoVariant = block.layout === "Centered" ? 2 : (block.variant || 1);
              return (
                <div key={`block-${index}`} className="video-block" data-block-index={index} {...hoverProps}>
                  <VideoBlock url={block.url} caption={block.caption} variant={videoVariant} />
                  <WiggleLine />
                </div>
              );
            }

            case "page-gallery": {
              const linkedPages = (block.pageIds || [])
                .map(id => (pages || []).find(p => p.id === id))
                .filter(Boolean);
              if (linkedPages.length === 0) return null;
              return (
                <div key={`block-${index}`} className="page-gallery-block px-8 py-4" data-block-index={index} {...hoverProps}>
                  <div className="grid grid-cols-2 gap-6">
                    {linkedPages.map(p => (
                      <a key={p.id} href="#" className="block group">
                        {pageDisplayThumbnail(p) ? (
                          <img
                            src={pageDisplayThumbnail(p)}
                            alt={p.title}
                            className="w-full aspect-[4/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                            No thumbnail
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-800 font-medium">{p.title}</div>
                      </a>
                    ))}
                  </div>
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
        />
      )}
    </div>
  );
};

export default Gallery;
