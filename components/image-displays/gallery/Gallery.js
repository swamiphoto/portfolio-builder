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
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail, pageThumbGradient } from "../../../common/assetRefs";
import ContactDisplay from "components/contact/ContactDisplay";

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

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, childPages, activeChildId, username, onBackClick, onSlideshowClick, onClientLoginClick, onChildPageClick, showPlaceholders, onBlockHover, onBlockClick, siteConfig }) => {
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
          const hoverProps = {
            ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
            ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
          };

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

            case "text": {
              if (!block.content) return showPlaceholders ? <div key={`block-${index}`}><PlaceholderText /><WiggleLine /></div> : null;
              const v = block.variant || 1;
              const variantClass =
                v === 4 ? "text-lg md:text-xl italic font-serif2 text-stone-600 leading-relaxed text-left max-w-2xl mx-auto px-8 py-6 border-l-2 border-stone-300"
                : v === 3 ? "text-base md:text-lg text-stone-700 leading-relaxed text-left max-w-2xl mx-auto px-8 py-4"
                : v === 2 ? "text-xl md:text-2xl font-medium text-stone-700 text-center max-w-2xl mx-auto py-6"
                : "text-3xl md:text-5xl font-light text-stone-800 text-center max-w-3xl mx-auto py-10";
              return (
                <div
                  key={`block-${index}`}
                  className={`text-block ${variantClass}`}
                  data-block-index={index}
                  {...hoverProps}
                >
                  {block.content}
                </div>
              );
            }

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
              const basePath = username ? `/sites/${username}` : '';
              const pgStackVariants = [
                {
                  first: "absolute -right-2 -bottom-2 w-full h-[400px] md:h-[500px] bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl",
                  second: "absolute -right-1 -bottom-1 w-full h-[400px] md:h-[500px] bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl",
                },
                {
                  first: "absolute -left-2 -bottom-2 w-full h-[400px] md:h-[500px] bg-[#ede8e0] -rotate-2 transition-transform duration-300 rounded-3xl",
                  second: "absolute -left-1 -bottom-1 w-full h-[400px] md:h-[500px] bg-[#f4efe8] -rotate-1 transition-transform duration-300 rounded-3xl",
                },
                {
                  first: "absolute -right-2 -top-2 w-full h-[400px] md:h-[500px] bg-[#ede8e0] -rotate-2 transition-transform duration-300 rounded-3xl",
                  second: "absolute -right-1 -top-1 w-full h-[400px] md:h-[500px] bg-[#f4efe8] -rotate-1 transition-transform duration-300 rounded-3xl",
                },
                {
                  first: "absolute -left-2 -top-2 w-full h-[400px] md:h-[500px] bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl",
                  second: "absolute -left-1 -top-1 w-full h-[400px] md:h-[500px] bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl",
                },
              ];
              return (
                <div key={`block-${index}`} className="page-gallery-block max-w-7xl mx-auto p-4" data-block-index={index} {...hoverProps}>
                  <div className="space-y-8">
                    {linkedPages.map((p, i) => {
                      const thumb = pageDisplayThumbnail(p);
                      const href = `${basePath}/${p.slug || p.id}`;
                      const stackStyle = pgStackVariants[i % pgStackVariants.length];
                      return (
                        <a key={p.id} href={href} className="flex flex-col md:flex-row gap-6 group hover:opacity-95 transition-opacity hover:no-underline" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="relative md:w-7/12">
                            <div className="relative">
                              <div className={stackStyle.first} />
                              <div className={stackStyle.second} />
                              <div className="relative overflow-hidden shadow-lg rounded-3xl">
                                {thumb ? (
                                  <img src={thumb} alt={p.title} className="w-full h-[400px] md:h-[500px] object-cover relative z-10 rounded-3xl" />
                                ) : (
                                  <div className="w-full h-[400px] md:h-[500px] rounded-3xl" style={{ background: pageThumbGradient(p.id) }} />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="md:w-5/12 space-y-3 py-2 flex flex-col justify-center text-left px-0 md:px-8">
                            <h2 className="text-4xl font-medium tracking-tight" style={{ color: '#1a1410', fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400 }}>{p.title}</h2>
                            {p.description && <p style={{ color: '#7a6b55', fontSize: '1.1rem', lineHeight: 1.6 }}>{p.description}</p>}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            }

            case "contact": {
              return (
                <div key={`block-${index}`} className="contact-block-wrap" data-block-index={index} {...hoverProps}>
                  <ContactDisplay
                    heading={block.heading}
                    subheading={block.subheading}
                    buttonText={block.buttonText}
                    toEmail={siteConfig?.contact?.email}
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
        />
      )}
    </div>
  );
};

export default Gallery;
