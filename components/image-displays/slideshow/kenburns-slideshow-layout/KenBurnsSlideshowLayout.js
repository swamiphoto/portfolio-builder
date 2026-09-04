import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "./KenBurnsSlideshowLayout.module.css";

const MAX_REM = 1.75;
const MIN_REM = 0.85;

// A text slide that auto-fits: it starts at MAX_REM and shrinks the font until
// the text fits the slide height (down to MIN_REM), so long passages stay fully
// on screen instead of scrolling or clipping. A slideshow auto-advances, so the
// text has to fit on its own (#104, #126).
const PAD_Y = 56; // vertical padding (px) on each side of the text box

function KenBurnsTextSlide({ content }) {
  const boxRef = useRef(null);
  const textRef = useRef(null);
  const [fontRem, setFontRem] = useState(MAX_REM);

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => {
      const avail = box.clientHeight - PAD_Y * 2; // content height inside the padding
      let s = MAX_REM;
      text.style.fontSize = `${s}rem`;
      let guard = 0;
      // Shrink until the text's natural height fits the available height.
      while (text.scrollHeight > avail && s > MIN_REM && guard < 60) {
        s = Math.max(MIN_REM, s - 0.05);
        text.style.fontSize = `${s}rem`;
        guard++;
      }
      setFontRem(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [content]);

  return (
    <div
      ref={boxRef}
      className="h-full w-full flex justify-center items-center overflow-hidden"
      style={{ padding: `${PAD_Y}px 24px`, boxSizing: "border-box" }}
    >
      <div
        ref={textRef}
        style={{
          fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
          fontSize: `${fontRem}rem`,
          lineHeight: 1.6,
          letterSpacing: "0.01em",
          textAlign: "center",
          whiteSpace: "pre-line",
          maxWidth: "46rem",
        }}
      >
        {content}
      </div>
    </div>
  );
}

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
              <KenBurnsTextSlide content={slide.content} />
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
