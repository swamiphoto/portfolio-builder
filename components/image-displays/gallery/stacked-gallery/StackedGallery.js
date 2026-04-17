import React, { useEffect, useState, useMemo } from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import styles from "./StackedGallery.module.css";

const StackedGallery = ({ images: imagesProp = [], imageUrls: imageUrlsProp = [], onImageClick }) => {
  const urlsKey = (imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const imageUrls = useMemo(
    () => imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp,
    [urlsKey]
  );
  const getCaptionForUrl = (url) => imagesProp.find(i => i.url === url)?.caption || '';

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

  const verticalImages = processedImages.filter((image) => image.aspectRatio < 1);
  const horizontalImages = processedImages.filter((image) => image.aspectRatio >= 1);

  const verticalPairs = [];
  for (let i = 0; i < verticalImages.length; i += 2) {
    verticalPairs.push([verticalImages[i], verticalImages[i + 1]]);
  }

  const combinedRows = [];
  const maxLength = Math.max(horizontalImages.length, verticalPairs.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < horizontalImages.length) {
      combinedRows.push(horizontalImages[i]);
    }
    if (i < verticalPairs.length) {
      combinedRows.push(verticalPairs[i]);
    }
  }

  return (
    <div className="pb-2">
      <div className={`${styles.stackedGallery}`}>
        {combinedRows.map((entry, index) => (
          <div key={`row-${index}`} className="mb-8">
            {Array.isArray(entry) ? (
              <div style={{ width: "72%", margin: "0 auto" }}>
                <div className="flex flex-row items-start justify-center gap-4">
                  {entry.map((image, idx) =>
                    image ? (
                      <div
                        key={`vertical-${index}-${idx}`}
                        className="flex flex-col"
                        style={{ width: "48%" }}
                      >
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
                        {getCaptionForUrl(image.src) && (
                          <p className="mt-2 text-sm italic text-center text-gray-500">{getCaptionForUrl(image.src)}</p>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <img
                  src={getSizedUrl(entry.src, 'display')}
                  alt=""
                  className="w-[72%] max-h-[calc(100vw * 0.35)] object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
                  onClick={() => onImageClick && onImageClick(entry.id)}
                  onError={(e) => {
                    console.error("Failed to load image in StackedGallery:", entry.src);
                    e.target.style.display = 'none';
                  }}
                />
                {getCaptionForUrl(entry.src) && (
                  <p className="mt-2 text-sm italic text-center text-gray-500 max-w-[72%]">{getCaptionForUrl(entry.src)}</p>
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
