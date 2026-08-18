import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./FilmStackSlideshowLayout.module.css";

const FilmStackSlideshowLayout = ({ slides, currentImageIndex }) => {
  const [tilts, setTilts] = useState([]);
  const [zTilts, setZTilts] = useState([]);
  const [moveXs, setMoveXs] = useState([]);
  const [moveYs, setMoveYs] = useState([]);
  const [durations, setDurations] = useState([]);
  const [direction, setDirection] = useState("left");
  // The slide that just left frame: it sweeps out for ~1s, revealing the one below.
  const [exitingIndex, setExitingIndex] = useState(null);
  const prevIndexRef = useRef(currentImageIndex);

  useEffect(() => {
    if (slides.length > 0) {
      // One value per slide index so lookups by index always line up.
      setTilts(slides.map(() => Math.random() * 12 - 6));
      setZTilts(slides.map(() => Math.random() * 20 - 10));
      setMoveXs(slides.map(() => `${Math.random() * 15 - 5}px`));
      setMoveYs(slides.map(() => `${Math.random() * 20 - 5}px`));
      setDurations(slides.map(() => `${Math.random() * 2 + 3}s`));
    }
  }, [slides]);

  // On each advance, sweep the outgoing slide off-screen (left or right) so the
  // stacked photo behind it is revealed — instead of a plain crossfade.
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === currentImageIndex) return;
    setDirection(Math.random() > 0.5 ? "left" : "right");
    setExitingIndex(prev);
    prevIndexRef.current = currentImageIndex;
    const t = setTimeout(() => setExitingIndex(null), 1000);
    return () => clearTimeout(t);
  }, [currentImageIndex]);

  return (
    <div className={`${styles["film-stack-container"]} mt-8 md:mt-0`}>
      {slides.map((slide, index) => {
        const isCurrentSlide = index === currentImageIndex;

        // The outgoing slide sweeps out; the current sits centered; upcoming
        // slides fan behind it; everything else is hidden.
        const stateClass =
          index === exitingIndex
            ? styles[`slide-out-${direction}`]
            : isCurrentSlide
            ? styles["visible"]
            : index > currentImageIndex
            ? styles["stacked"]
            : styles["hidden"];

        if (slide.type === "image") {
          return (
            <div
              key={index}
              className={`${styles["film-stack-image"]} ${stateClass}`}
              style={{
                "--rotate": `${tilts[index] || 0}deg`,
                "--rotateZ": `${zTilts[index] || 0}deg`,
                "--moveX": moveXs[index] || "0px",
                "--moveY": moveYs[index] || "0px",
                "--duration": durations[index] || "4s",
                zIndex: slides.length - index,
              }}>
              <img src={slide.url} alt={`Slide ${index + 1}`} />
              {slide.caption && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <div className="text-center text-gray-200 px-4 text-xl max-w-3xl leading-tight drop-shadow-lg">{slide.caption}</div>
                </div>
              )}
            </div>
          );
        }

        if (slide.type === "text") {
          // The sweep-out keyframes are scoped to images; the text card just fades.
          const textState = isCurrentSlide ? styles["visible"] : styles["hidden"];
          return (
            <div
              key={index}
              className={`${styles["film-stack-text"]} ${textState}`}
              style={{ "--rotate": `${tilts[index] || 0}deg`, zIndex: slides.length - index }}>
              <p className={`${styles["film-stack-text-content"]} font-serif2`}>{slide.content}</p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

FilmStackSlideshowLayout.propTypes = {
  slides: PropTypes.array.isRequired,
  currentImageIndex: PropTypes.number.isRequired,
  transitioning: PropTypes.bool.isRequired,
};

export default FilmStackSlideshowLayout;
