import React, { useEffect, useState, useMemo } from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import { captionStyleCss } from "../../../../common/captionStyles";
import styles from "./StackedGallery.module.css";
import BuyPrintButton from "../../print/BuyPrintButton";
import EngagementActions from "../../engagement/EngagementActions";
import WatermarkOverlay from "../../engagement/WatermarkOverlay";
import HoverCaption from "../HoverCaption";

const StackedGallery = ({ images: imagesProp = [], imageUrls: imageUrlsProp = [], onImageClick, captionStyle = 'sans', widthPct = 72, insideCaption = false, leftAlign = false }) => {
  const capCss = captionStyleCss(captionStyle);
  const colWidth = `${widthPct}%`;
  const urlsKey = (imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const imageUrls = useMemo(
    () => imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp,
    [urlsKey]
  );
  const getCaptionForUrl = (url) => imagesProp.find(i => i.url === url)?.caption || '';
  const getPrintForUrl = (url) => imagesProp.find(i => i.url === url)?.print;

  const [processedImages, setProcessedImages] = useState([]);

  useEffect(() => {
    setProcessedImages([]);

    if (imageUrls.length === 0) {
      return;
    }

    imageUrls.forEach((url, index) => {
      const processedUrl = getSizedUrl(url, 'display');
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;

        setProcessedImages((prev) => {
          const alreadyExists = prev.some((image) => image.src === url);
          if (alreadyExists) return prev;

          return [...prev, { src: url, aspectRatio, id: index }];
        });
      };
      img.onerror = () => {
        setProcessedImages((prev) => {
          const alreadyExists = prev.some((image) => image.src === url);
          if (alreadyExists) return prev;

          return [...prev, { src: url, aspectRatio: 1, id: index }];
        });
      };
      img.src = processedUrl;
    });
  }, [imageUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  // leftAlign (Manhattan): one full-width column, every image in order regardless
  // of orientation — portraits get the same full span as landscapes, just taller.
  // Otherwise: interleave full-width landscapes with 48% portrait pairs.
  let combinedRows;
  if (leftAlign) {
    combinedRows = [...processedImages].sort((a, b) => a.id - b.id);
  } else {
    const verticalImages = processedImages.filter((image) => image.aspectRatio < 1);
    const horizontalImages = processedImages.filter((image) => image.aspectRatio >= 1);

    const verticalPairs = [];
    for (let i = 0; i < verticalImages.length; i += 2) {
      verticalPairs.push([verticalImages[i], verticalImages[i + 1]]);
    }

    combinedRows = [];
    const maxLength = Math.max(horizontalImages.length, verticalPairs.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < horizontalImages.length) {
        combinedRows.push(horizontalImages[i]);
      }
      if (i < verticalPairs.length) {
        combinedRows.push(verticalPairs[i]);
      }
    }
  }

  return (
    <div className="pb-2">
      <div className={`${styles.stackedGallery}`}>
        {combinedRows.map((entry, index) => (
          <div key={`row-${index}`} className="mb-8">
            {Array.isArray(entry) ? (
              <div style={{ width: colWidth, margin: leftAlign ? 0 : "0 auto" }}>
                <div className={`flex flex-row items-start ${leftAlign ? 'justify-start' : 'justify-center'} gap-4`}>
                  {entry.map((image, idx) =>
                    image ? (
                      <div
                        key={`vertical-${index}-${idx}`}
                        className="flex flex-col"
                        style={{ width: "48%" }}
                      >
                        <div className="relative group">
                          <img
                            src={getSizedUrl(image.src, 'display')}
                            alt=""
                            className="h-auto w-full object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
                            onClick={() => onImageClick && onImageClick(image.id)}
                            onError={(e) => {
                              console.error("Failed to load image in StackedGallery:", image.src);
                              e.target.style.display = 'none';
                            }}
                          />
                          <WatermarkOverlay />
                          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <BuyPrintButton print={getPrintForUrl(image.src)} imageUrl={image.src} />
                          </div>
                          <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
                            <EngagementActions imageUrl={image.src} />
                          </div>
                          {insideCaption && <HoverCaption caption={getCaptionForUrl(image.src)} captionStyle={captionStyle} />}
                        </div>
                        {getCaptionForUrl(image.src) && !insideCaption && (
                          <p className="mt-2 text-sm italic text-center text-gray-500" style={capCss}>{getCaptionForUrl(image.src)}</p>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            ) : (
              <div className={`w-full flex flex-col ${leftAlign ? 'items-start' : 'items-center'}`}>
                <div className="relative group" style={{ width: colWidth }}>
                  <img
                    src={getSizedUrl(entry.src, 'display')}
                    alt=""
                    className={`w-full object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer ${leftAlign ? 'h-auto' : 'max-h-[calc(100vw * 0.35)]'}`}
                    onClick={() => onImageClick && onImageClick(entry.id)}
                    onError={(e) => {
                      console.error("Failed to load image in StackedGallery:", entry.src);
                      e.target.style.display = 'none';
                    }}
                  />
                  <WatermarkOverlay />
                  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <BuyPrintButton print={getPrintForUrl(entry.src)} imageUrl={entry.src} />
                  </div>
                  <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
                    <EngagementActions imageUrl={entry.src} />
                  </div>
                  {insideCaption && <HoverCaption caption={getCaptionForUrl(entry.src)} captionStyle={captionStyle} />}
                </div>
                {getCaptionForUrl(entry.src) && !insideCaption && (
                  <p className="mt-2 text-sm italic text-center text-gray-500" style={{ ...capCss, maxWidth: colWidth }}>{getCaptionForUrl(entry.src)}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StackedGallery;
