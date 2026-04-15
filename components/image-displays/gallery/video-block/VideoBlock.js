import React, { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";

const VideoBlock = ({ url, caption, variant = 1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 } // Trigger when 30% of the video is visible
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const videoContainerStyle = (() => {
    if (variant === 1) return "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen"; // Updated to match PhotoBlock approach
    if (variant === 2) return "w-full md:w-[85%] mx-auto"; // Full width on mobile, centered at 85% on desktop
    if (variant === 3) return "w-full md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row gap-6"; // Full width on mobile
    return "w-full"; // Default fallback
  })();

  const videoStyle = "relative pb-[56.25%] overflow-hidden shadow-lg"; // Shared video styles
  const videoWrapperStyle = variant === 1 ? "rounded-none shadow-none" : "rounded-3xl shadow-lg";

  // Update the ReactPlayer components in both variants
  const playerProps = {
    url: url,
    className: "absolute top-0 left-0 w-full h-full",
    width: "100%",
    height: "100%",
    controls: true,
    playing: isVisible,
    loop: true,
    muted: true, // Muted is required for autoplay
    config: {
      youtube: {
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1,
          iv_load_policy: 3,
          disablekb: 1,
        },
      },
    },
  };

  return (
    <div className={`${videoContainerStyle} ${variant === 1 ? "ml-0 overflow-x-hidden" : ""}`}>
      {variant === 3 ? (
        // Variant 3: Video on the left, caption on the right
        <>
          <div ref={videoRef} className={`w-full ${videoStyle}`}>
            <ReactPlayer {...playerProps} />
          </div>
          <div className="w-full md:w-1/3 flex items-center">{caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0">{caption}</p>}</div>
        </>
      ) : (
        // Variant 1 and 2: Common layout
        <>
          <div ref={videoRef} className={`${videoStyle} ${videoWrapperStyle}`}>
            <ReactPlayer {...playerProps} />
          </div>
          {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto">{caption}</p>}
        </>
      )}
    </div>
  );
};

export default VideoBlock;
