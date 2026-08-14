import React from "react";
import ReactPlayer from "react-player";
import { captionStyleCss } from "../../../../common/captionStyles";
import HoverCaption from "../HoverCaption";

/**
 * Extract a YouTube thumbnail URL from a YouTube video URL.
 * Handles watch?v=, youtu.be/, and /embed/ forms.
 * Uses the 16:9 maxresdefault frame (not the 4:3 hqdefault, which letterboxes the
 * video with black bars top/bottom). Returns null for non-YouTube URLs.
 */
export function posterUrl(url) {
  if (!url) return null;
  const match = (url || "").match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/
  );
  if (match) return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
  return null;
}

// variant: 'full-bleed' (1) | 'centered' (2) | 'side' (3)
// bleed: Manhattan — full content width, square corners, left-aligned caption
// (same treatment as photos), regardless of variant.
const VideoBlock = ({ url, caption, variant = 2, captionStyle = 'sans', bleed = false }) => {
  const capCss = captionStyleCss(captionStyle);
  // react-player caches its "can I play this?" decision, so key the player on the
  // URL to force a clean re-init when it changes — otherwise the preview stays blank.
  const cleanUrl = (url || "").trim();
  const isSide = variant === 3 && !bleed;

  const videoContainerStyle = (() => {
    if (bleed) return "w-full"; // Manhattan: full content width, square corners
    if (variant === 1) return "w-full mx-auto"; // full bleed: edge-to-edge, square corners
    // Non-bleed videos match the photo widths on mobile: uniform 10px side margin.
    if (variant === 3) return "w-full px-[10px] md:px-0 md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6"; // side
    return "w-full px-[10px] md:px-0 md:w-[85%] mx-auto"; // centered (default)
  })();

  const videoStyle = "relative aspect-[16/9] w-full overflow-hidden"; // standard 16:9
  const videoWrapperStyle = (bleed || variant === 1) ? "rounded-none shadow-none" : "rounded-3xl shadow-lg";

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
    <div className={videoContainerStyle}>
      {isSide ? (
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
          <div className={`group ${videoStyle} ${videoWrapperStyle}`}>
            <ReactPlayer key={cleanUrl} {...playerProps} />
            {/* Manhattan: caption inside on hover (same as photos), not below. */}
            {bleed && <HoverCaption caption={caption} captionStyle={captionStyle} />}
          </div>
          {caption && !bleed && <p className="my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto" style={capCss}>{caption}</p>}
        </>
      )}
    </div>
  );
};

export default VideoBlock;
