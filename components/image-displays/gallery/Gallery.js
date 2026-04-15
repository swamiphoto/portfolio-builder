import React from "react";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  // Check if the screen size is small
  const isSmallScreen = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <div className="gallery-container">
      {/* Render the GalleryCover */}
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} />

      {/* Render the blocks */}
      <div className="space-y-10">
        {blocks.map((block, index) => {
          switch (block.type) {
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
