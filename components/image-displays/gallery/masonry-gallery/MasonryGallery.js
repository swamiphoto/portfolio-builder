import React from "react";
import Masonry from "react-masonry-css";
import { getSizedUrl } from "../../../../common/imageUtils";
import { captionStyleCss } from "../../../../common/captionStyles";
import styles from "./MasonryGallery.module.css";
import BuyPrintButton from "../../print/BuyPrintButton";
import EngagementActions from "../../engagement/EngagementActions";
import WatermarkOverlay from "../../engagement/WatermarkOverlay";
import HoverCaption from "../HoverCaption";

const MasonryGallery = ({ images = [], imageUrls = [], onImageClick, columns, captionStyle = 'sans', insideCaption = false, bleed = false }) => {
  const capCss = captionStyleCss(captionStyle);
  const items = images.length > 0 ? images : imageUrls.map(url => ({ url, caption: '' }));
  const breakpointColumnsObj = columns != null ? { default: columns } : { default: 2, 700: 1 };

  return (
    <div className={`flex flex-col ${bleed ? 'items-stretch' : 'items-center'}`}>
      <div className={`${styles.masonryGallery} w-full ${bleed ? '' : 'max-w-6xl mx-auto'}`}>
        <div className={`gallery-content flex-grow ${bleed ? '' : 'md:p-4'} overflow-hidden`}>
          <Masonry breakpointCols={breakpointColumnsObj} className="flex w-auto -ml-5" columnClassName="pl-5">
            {items.length > 0 ? (
              items.map(({ url, caption, print }, index) => {
                const imageUrl = getSizedUrl(url, 'display');
                return (
                  <div key={index} className="mb-5">
                    <div className="relative group">
                      <img
                        src={imageUrl}
                        alt={caption || `Image ${index + 1}`}
                        className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl cursor-pointer"
                        onError={(e) => {
                          console.error("Image failed to load:", imageUrl);
                          e.target.style.display = 'none';
                        }}
                        onClick={() => onImageClick && onImageClick(index)}
                      />
                      <WatermarkOverlay />
                      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <BuyPrintButton print={print} imageUrl={url} />
                      </div>
                      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
                        <EngagementActions imageUrl={url} />
                      </div>
                      {insideCaption && <HoverCaption caption={caption} captionStyle={captionStyle} />}
                    </div>
                    {caption && !insideCaption && (
                      <p className="mt-2 text-sm italic text-center text-gray-500" style={capCss}>{caption}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500">No images available.</p>
            )}
          </Masonry>
        </div>
      </div>
    </div>
  );
};

export default MasonryGallery;
