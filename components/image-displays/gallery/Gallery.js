import React from "react";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  const isSmallScreen = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <div className="gallery-container">
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} />

      <div className="space-y-10">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "photos": {
              const usemasonry = block.layout === "masonry" || isSmallScreen;
              return (
                <div key={`block-${index}`} className="photos-block">
                  {usemasonry
                    ? <MasonryGallery imageUrls={block.imageUrls || []} />
                    : <StackedGallery imageUrls={block.imageUrls || []} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked":
              return (
                <div key={`block-${index}`} className="stacked-gallery-block">
                  {isSmallScreen ? <MasonryGallery imageUrls={block.imageUrls || []} /> : <StackedGallery imageUrls={block.imageUrls || []} />}
                  <WiggleLine />
                </div>
              );

            case "masonry":
              return (
                <div key={`block-${index}`} className="masonry-gallery-block">
                  <MasonryGallery imageUrls={block.imageUrls || []} />
                  <WiggleLine />
                </div>
              );

            case "text":
              return (
                <div key={`block-${index}`} className={`text-block text-center text-2xl md:text-4xl text-gray-800 max-w-3xl mx-auto py-10 ${block.variant === 2 ? "font-serif2" : ""}`}>
                  {block.content}
                </div>
              );

            case "photo":
              if (!block.imageUrl) return null;
              return (
                <div key={`block-${index}`} className="photo-block">
                  <PhotoBlock imageUrl={block.imageUrl} caption={block.caption} variant={block.variant || 1} />
                  <WiggleLine />
                </div>
              );

            case "video":
              return (
                <div key={`block-${index}`} className="video-block">
                  <VideoBlock url={block.url} caption={block.caption} variant={block.variant || 1} />
                  <WiggleLine />
                </div>
              );

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
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
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
    </div>
  );
};

export default Gallery;
