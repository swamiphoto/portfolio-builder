import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";
import PhotoLightbox from "../PhotoLightbox";
import { getImageRefUrl, normalizeImageRefs } from "../../../common/assetRefs";

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  const isSmallScreen = useMediaQuery({ query: "(max-width: 768px)" });
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
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} />

      <div className="space-y-10">
        {(blocks || []).map((block, index) => {
          switch (block.type) {
            case "photos": {
              const usemasonry = block.layout === "masonry" || isSmallScreen;
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="photos-block">
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="stacked-gallery-block">
                  {isSmallScreen
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "masonry": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="masonry-gallery-block">
                  <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                  <WiggleLine />
                </div>
              );
            }

            case "text":
              return (
                <div key={`block-${index}`} className={`text-block text-center text-2xl md:text-4xl text-gray-800 max-w-3xl mx-auto py-10 ${block.variant === 2 ? "font-serif2" : ""}`}>
                  {block.content}
                </div>
              );

            case "photo": {
              if (!getImageRefUrl(block.image || block.imageUrl)) return null;
              const photoVariant = block.layout === "Centered" ? 2 : (block.variant || 1);
              return (
                <div key={`block-${index}`} className="photo-block">
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
                <div key={`block-${index}`} className="video-block">
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
                <div key={`block-${index}`} className="page-gallery-block px-8 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    {linkedPages.map(p => (
                      <a key={p.id} href="#" className="block group">
                        {getImageRefUrl(p.thumbnail || p.thumbnailUrl) ? (
                          <img
                            src={getImageRefUrl(p.thumbnail || p.thumbnailUrl)}
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
