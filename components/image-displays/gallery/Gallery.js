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
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail, pageThumbGradient, focalPointToObjectPosition } from "../../../common/assetRefs";
import ContactDisplay from "components/contact/ContactDisplay";
import { PrintStoreProvider } from "../print/PrintStoreContext";
import { resolveVariant, resolveAlign, resolveFont, resolveButtonStyle } from "../../../common/themes/variants";
import { resolveCaptionStyle } from "../../../common/captionStyles";
import { resolveSubNavStyle } from '../../../common/siteDesign';
import ManhattanGrid from "../themes/manhattan/ManhattanGrid";
import GridGallery from "./grid-gallery/GridGallery";
import SquareGallery from "./square-gallery/SquareGallery";
import FramedPhoto from "./photo-block/FramedPhoto";

// Varying heights per column slot to mimic natural photo proportions
const PLACEHOLDER_ASPECTS = [
  'aspect-[4/3]', 'aspect-[3/4]', 'aspect-[4/3]',
  'aspect-[3/4]', 'aspect-[4/3]', 'aspect-[3/4]',
]

function PlaceholderIcon() {
  return (
    <svg className="w-10 h-10" style={{ color: '#d3c6b2' }} viewBox="0 0 48 48" fill="none">
      <rect x="4" y="10" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="33" cy="18" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 32 l10-10 a2 2 0 0 1 2.8 0l8 8 a2 2 0 0 0 2.8 0l4-4 a2 2 0 0 1 2.8 0L44 34" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function PlaceholderTile({ aspectClass = 'aspect-[4/3]' }) {
  return (
    <div className={`${aspectClass} w-full rounded-3xl flex items-center justify-center select-none mb-5`} style={{ background: '#ede7dc' }}>
      <PlaceholderIcon />
    </div>
  )
}

// The empty-state preview shown on the right. It mirrors the block's chosen
// layout so the photographer sees what a photos block will look like before
// adding any images.
function PlaceholderGrid({ variant = 'masonry' }) {
  if (variant === 'stacked') {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8" data-photos-placeholder="stacked">
        <PlaceholderTile aspectClass="aspect-[3/2]" />
        <div className="flex gap-5">
          <div className="flex-1"><PlaceholderTile aspectClass="aspect-[3/4]" /></div>
          <div className="flex-1"><PlaceholderTile aspectClass="aspect-[3/4]" /></div>
        </div>
      </div>
    )
  }
  if (variant === 'square') {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-8" data-photos-placeholder="square">
        <div className="grid grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => <PlaceholderTile key={i} aspectClass="aspect-square" />)}
        </div>
      </div>
    )
  }
  if (variant === 'grid') {
    // Justified row: equal height, widths vary by aspect (portraits narrower).
    const ratios = [1.5, 0.7, 1.2, 1.0]
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8" data-photos-placeholder="grid">
        <div className="flex gap-5" style={{ height: 200 }}>
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
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8" data-photos-placeholder="masonry">
      <div style={{ columnCount: 3, columnGap: '1.25rem' }}>
        {PLACEHOLDER_ASPECTS.map((aspect, i) => (
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

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, childPages, activeChildId, username, basePath, onBackClick, onSlideshowClick, onClientLoginClick, onChildPageClick, showPlaceholders, onBlockHover, onBlockClick, siteConfig, printStore, themeId = 'kyoto', hasCover = false, coverHeight = 'partial', coverButtonStyle = 'solid' }) => {
  const linkBase = basePath != null ? basePath : (username ? `/sites/${username}` : '')
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
    <PrintStoreProvider printStore={printStore} username={username}>
    <div className="gallery-container">
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} childPages={childPages} activeChildId={activeChildId} username={username} basePath={basePath} onChildPageClick={onChildPageClick} showChildNav={resolveSubNavStyle(siteConfig?.design) === 'inline'} suppressCover={hasCover} coverHeight={coverHeight} buttonStyle={coverButtonStyle} />

      <div className="space-y-10">
        {(blocks || []).map((block, index) => {
          const hoverProps = {
            ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
            ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
          };

          switch (block.type) {
            case "photos": {
              const variantId = resolveVariant(block, themeId)
              const usemasonry = variantId === 'masonry' || isSmallScreen;
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant={variantId} /><WiggleLine /></div> : null;
              if (variantId === 'grid') {
                return (
                  <div key={`block-${index}`} className="photos-grid-block" data-block-index={index} {...hoverProps}>
                    {themeId === 'manhattan'
                      ? <ManhattanGrid images={imageRefs} onImageClick={makeClickHandler(index)} />
                      : <GridGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  </div>
                );
              }
              if (variantId === 'square') {
                return (
                  <div key={`block-${index}`} className="photos-square-block" data-block-index={index} {...hoverProps}>
                    <SquareGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                  </div>
                );
              }
              return (
                <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}>
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : 2} captionStyle={resolveCaptionStyle(block)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={resolveCaptionStyle(block)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="stacked-gallery-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant="stacked" /><WiggleLine /></div> : null;
              return (
                <div key={`block-${index}`} className="stacked-gallery-block" data-block-index={index} {...hoverProps}>
                  {isSmallScreen
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={1} captionStyle={resolveCaptionStyle(block)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={resolveCaptionStyle(block)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "masonry": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              if (!imageRefs.length) return showPlaceholders ? <div key={`block-${index}`} className="masonry-gallery-block" data-block-index={index} {...hoverProps}><PlaceholderGrid variant="masonry" /><WiggleLine /></div> : null;
              return (
                <div key={`block-${index}`} className="masonry-gallery-block" data-block-index={index} {...hoverProps}>
                  <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : 2} captionStyle={resolveCaptionStyle(block)} />
                  <WiggleLine />
                </div>
              );
            }

            case "text": {
              if (!block.content) return showPlaceholders ? <div key={`block-${index}`} data-block-index={index} {...hoverProps}><PlaceholderText /><WiggleLine /></div> : null;
              const variantId = resolveVariant(block, themeId)
              const v = { heading: 1, subheading: 2, body: 3, quote: 4 }[variantId] || 1
              const align = resolveAlign(block, themeId)
              const alignClass = align === 'left' ? 'text-left' : 'text-center';
              const fontFamily = resolveFont(block, themeId);
              const variantClass =
                v === 4 ? `text-lg md:text-xl italic text-stone-600 leading-relaxed ${alignClass} max-w-2xl mx-auto px-8 py-6 border-l-2 border-stone-300`
                : v === 3 ? `text-base md:text-lg text-stone-700 leading-relaxed ${alignClass} max-w-2xl mx-auto px-8 py-4`
                : v === 2 ? `text-xl md:text-2xl font-medium text-stone-700 ${alignClass} max-w-2xl mx-auto py-6`
                : `text-3xl md:text-4xl font-light leading-snug text-stone-800 ${alignClass} max-w-3xl mx-auto py-10`;
              return (
                <div
                  key={`block-${index}`}
                  className={`text-block ${variantClass}`}
                  style={{ fontFamily }}
                  data-block-index={index}
                  {...hoverProps}
                >
                  {block.content}
                </div>
              );
            }

            case "photo": {
              if (!getImageRefUrl(block.image || block.imageUrl)) return showPlaceholders ? <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}><PlaceholderPhoto /><WiggleLine /></div> : null;
              if (themeId === 'manhattan' && resolveVariant(block, themeId) === 'framed') {
                return (
                  <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                    <FramedPhoto imageUrl={getImageRefUrl(block.image || block.imageUrl)} caption={block.caption} onImageClick={makeClickHandler(index)} captionStyle={resolveCaptionStyle(block)} />
                  </div>
                );
              }
              const variantId = resolveVariant(block, themeId)
              const photoVariant = variantId === 'centered' ? 2 : 1
              return (
                <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                  <PhotoBlock
                    imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                    caption={block.caption}
                    variant={photoVariant}
                    onImageClick={makeClickHandler(index)}
                    print={block.print}
                    captionStyle={resolveCaptionStyle(block)}
                  />
                  <WiggleLine />
                </div>
              );
            }

            case "video": {
              const variantId = resolveVariant(block, themeId)
              const videoVariant = { 'full-bleed': 1, centered: 2, 'side-by-side': 3 }[variantId] || 2
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
                      const href = `${linkBase}/${p.slug || p.id}`;
                      const stackStyle = pgStackVariants[i % pgStackVariants.length];
                      return (
                        <a key={p.id} href={href} onClick={onChildPageClick ? (e) => { e.preventDefault(); onChildPageClick(p.id); } : undefined} className="flex flex-col md:flex-row gap-6 group hover:opacity-95 transition-opacity hover:no-underline" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="relative md:w-7/12">
                            <div className="relative">
                              <div className={stackStyle.first} />
                              <div className={stackStyle.second} />
                              <div className="relative overflow-hidden shadow-lg rounded-3xl">
                                {thumb ? (
                                  <img src={thumb} alt={p.title} className="w-full h-[400px] md:h-[500px] object-cover relative z-10 rounded-3xl" style={{ objectPosition: focalPointToObjectPosition(p.thumbnail?.focalPoint) }} />
                                ) : (
                                  <div className="w-full h-[400px] md:h-[500px] rounded-3xl" style={{ background: pageThumbGradient(p.id) }} />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="md:w-5/12 space-y-3 py-2 flex flex-col justify-center text-left px-0 md:px-8">
                            <h2 className="text-4xl font-medium tracking-tight font-serif" style={{ color: '#1a1410', fontWeight: 400 }}>{p.title}</h2>
                            {p.description && <p className="font-serif" style={{ color: '#7a6b55', fontSize: '1.1rem', lineHeight: 1.6 }}>{p.description}</p>}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            }

            case "testimonial": {
              const photoUrl = getImageRefUrl(block.image || block.imageUrl)
              const v = resolveVariant(block, themeId) === 'quote-above' ? 2 : 1
              const CG = '"Cormorant Garamond", "Cormorant", Georgia, serif'
              const FR = '"Fraunces", Georgia, serif'

              if (!block.text && !block.name && !photoUrl) {
                if (!showPlaceholders) return null
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
                    <WiggleLine />
                  </div>
                )
              }

              const avatar = photoUrl && (
                <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,18,10,0.12)' }}>
                  <img src={photoUrl} alt={block.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )
              const quote = block.text && (
                <blockquote style={{ fontFamily: CG, fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)', fontStyle: 'italic', fontWeight: 400, color: '#2c2416', lineHeight: 1.65, margin: 0, padding: 0 }}>
                  &#8220;{block.text}&#8221;
                </blockquote>
              )
              const byline = block.name && (
                <div style={{ fontFamily: FR, fontSize: '1rem', fontWeight: 400, color: '#7a6b55', letterSpacing: '0.03em' }}>
                  — {block.name}
                </div>
              )

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
                  <WiggleLine />
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
