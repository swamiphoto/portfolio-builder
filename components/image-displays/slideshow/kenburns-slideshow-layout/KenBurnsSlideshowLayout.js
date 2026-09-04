import React from "react";
import PropTypes from "prop-types";
import styles from "./KenBurnsSlideshowLayout.module.css";

const KenBurnsSlideshowLayout = ({ slides, currentImageIndex, transitioning, aspectRatios = [] }) => {
  // Filter the slides to extract only the images for proper aspect ratio handling
  const imageSlides = slides.filter((slide) => slide.type === "image");

  return (
    <div className={`${styles["kenburns-container"]} bg-black relative`}>
      {slides.map((slide, index) => {
        if (slide.type === "text") {
          // Render text slide — clean mono type (not the Muse display face), sized
          // responsively and capped to the viewport so long passages scroll within
          // the slide instead of bleeding off the top/bottom edges (#104, #126).
          return (
            <div key={index} className={`${styles["kenburns-text"]} bg-black text-white ${index === currentImageIndex ? (transitioning ? styles["kenburns-slide-out"] : styles["kenburns-visible"]) : styles["kenburns-hidden"]}`}>
              <div className="flex justify-center items-center h-full px-6 py-14">
                <div
                  style={{
                    fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
                    fontSize: 'clamp(1rem, 2.2vw, 1.75rem)',
                    lineHeight: 1.6,
                    letterSpacing: '0.01em',
                    textAlign: 'center',
                    whiteSpace: 'pre-line',
                    maxWidth: '46rem',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                  }}
                >
                  {slide.content}
                </div>
              </div>
            </div>
          );
        } else if (slide.type === "image") {
          // Calculate the aspect ratio using the filtered imageSlides array
          const aspectRatio = aspectRatios[imageSlides.findIndex((imgSlide) => imgSlide.url === slide.url)];
          const isVertical = aspectRatio < 1;
          const isHorizontal = aspectRatio >= 1;

          return (
            <div key={index} className={`${styles["kenburns-image"]} ${isVertical ? styles["vertical"] : ""} ${isHorizontal ? styles["horizontal"] : ""} ${index === currentImageIndex ? (transitioning ? styles["kenburns-slide-out"] : styles["kenburns-visible"]) : styles["kenburns-hidden"]}`}>
              <img src={slide.url} alt={`Image ${index + 1}`} />
              {slide.caption && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center px-4">
                  <div
                    className="text-center max-w-2xl leading-snug"
                    style={{
                      fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
                      fontSize: 'clamp(0.8rem, 1.4vw, 1.05rem)',
                      letterSpacing: '0.03em',
                      color: '#f2efe9',
                      textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    {slide.caption}
                  </div>
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
};

KenBurnsSlideshowLayout.propTypes = {
  slides: PropTypes.array.isRequired, // Combined slides with both image and text types
  currentImageIndex: PropTypes.number.isRequired,
  transitioning: PropTypes.bool.isRequired,
  aspectRatios: PropTypes.array.isRequired,
  hideCaptionsOnMobile: PropTypes.bool.isRequired,
};

export default KenBurnsSlideshowLayout;
