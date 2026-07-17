import React from "react";
import ReactPlayer from "react-player";
import { captionStyleCss } from "../../../../common/captionStyles";

/**
 * Extract a YouTube thumbnail URL from a YouTube video URL.
 * Handles watch?v=, youtu.be/, and /embed/ forms.
 * Returns null for non-YouTube URLs (react-player fetches its own thumbnail).
 */
export function posterUrl(url) {
  if (!url) return null;
  const match = (url || "").match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/
  );
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return null;
}

// variant: 'full-bleed' (1) | 'centered' (2) | 'side' (3)
const VideoBlock = ({ url, caption, variant = 2, captionStyle = 'sans' }) => {
  const capCss = captionStyleCss(captionStyle);
  // react-player caches its "can I play this?" decision, so key the player on the
  // URL to force a clean re-init when it changes — otherwise the preview stays blank.
  const cleanUrl = (url || "").trim();

  const videoContainerStyle = (() => {
    if (variant === 1) return "relative left-1/2 -translate-x-1/2 w-screen max-w-none"; // full bleed
    if (variant === 3) return "w-full md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6"; // side
    return "w-full md:w-[85%] mx-auto"; // centered (default)
  })();

  const videoStyle = "relative pb-[56.25%] overflow-hidden"; // 16:9
  const videoWrapperStyle = variant === 1 ? "rounded-none shadow-none" : "rounded-3xl shadow-lg";

  // light mode: shows the real thumbnail with a play button, loads + plays on click.
  // Reliable in every context (no IntersectionObserver autoplay that never fires in
  // the editor preview). Falls back to react-player's own thumbnail for non-YouTube.
  const playerProps = {
    url: cleanUrl,
    className: "absolute top-0 left-0 w-full h-full",
    width: "100%",
    height: "100%",
    controls: true,
    light: posterUrl(cleanUrl) || true,
    playing: true, // start playing once the light preview is clicked
    config: {
      youtube: {
        playerVars: { modestbranding: 1, rel: 0, fs: 1, iv_load_policy: 3 },
      },
    },
  };

  if (!cleanUrl) return null;

  return (
    <div className={`${videoContainerStyle} ${variant === 1 ? "overflow-x-hidden" : ""}`}>
      {variant === 3 ? (
        // Side: video on the left, caption on the right
        <>
          <div className={`w-full md:w-2/3 ${videoStyle} ${videoWrapperStyle}`}>
            <ReactPlayer key={cleanUrl} {...playerProps} />
          </div>
          <div className="w-full md:w-1/3 flex items-center">
            {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0" style={capCss}>{caption}</p>}
          </div>
        </>
      ) : (
        // Full-bleed and centered
        <>
          <div className={`${videoStyle} ${videoWrapperStyle}`}>
            <ReactPlayer key={cleanUrl} {...playerProps} />
          </div>
          {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto" style={capCss}>{caption}</p>}
        </>
      )}
    </div>
  );
};

export default VideoBlock;
