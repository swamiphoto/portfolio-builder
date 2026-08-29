import React, { useState, useEffect } from "react";
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

/**
 * Extract the Instagram shortcode from a reel/post/tv URL, or null if it's not an
 * Instagram link. Handles /reel/, /reels/, /p/, and /tv/.
 * react-player can't play Instagram, so these render as a vertical embed instead.
 */
export function youtubeId(url) {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function instagramShortcode(url) {
  const m = (url || "").match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function isInstagramVideo(url) {
  return !!instagramShortcode(url);
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

  // YouTube poster: maxresdefault (1280x720) only exists for HD-source uploads;
  // for everything else it 404s and react-player shows a grey box. Start
  // optimistic, then fall back to hqdefault (always exists; react-player uses
  // background-size:cover, so the 4:3 frame crops clean) if maxres is missing.
  const ytId = youtubeId(cleanUrl);
  const [poster, setPoster] = useState(ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null);
  useEffect(() => {
    if (!ytId) { setPoster(null); return; }
    const maxres = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    setPoster(maxres);
    const probe = new Image();
    // A missing maxres 404s (onerror); YouTube also sometimes serves a 120x90
    // grey stub with 200 — catch that via naturalWidth too.
    probe.onload = () => { if (probe.naturalWidth <= 120) setPoster(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`); };
    probe.onerror = () => setPoster(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
    probe.src = maxres;
  }, [ytId]);

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
    light: poster || true,
    playing: true, // start playing once the light preview is clicked
    config: {
      youtube: {
        playerVars: { modestbranding: 1, rel: 0, fs: 1, iv_load_policy: 3 },
      },
    },
  };

  if (!cleanUrl) return null;

  // Instagram reels are vertical and react-player can't play them, so render the
  // official /embed card in a portrait frame, with the details caption below.
  const igCode = instagramShortcode(cleanUrl);
  if (igCode) {
    // Reels are vertical, so the block variants map to a vertical frame: our
    // theme frame (rounded vs square corners + shadow) wraps the /embed card,
    // and the variant sets width/placement. Instagram's own card chrome is
    // cross-origin, so we can only style around it.
    const frameCorners = (bleed || variant === 1) ? "rounded-none shadow-none" : "rounded-3xl shadow-lg";
    const igFrame = (
      <div className={`relative w-full overflow-hidden ${frameCorners}`} style={{ aspectRatio: "9 / 16", background: "#000" }}>
        <iframe
          key={cleanUrl}
          src={`https://www.instagram.com/reel/${igCode}/embed`}
          title="Instagram reel"
          loading="lazy"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          style={{ border: 0 }}
        />
      </div>
    );

    // Side: reel on the left, details caption beside it (works great for vertical).
    if (isSide) {
      return (
        <div className="w-full px-[10px] md:px-0 md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-full mx-auto md:mx-0" style={{ maxWidth: 300 }}>{igFrame}</div>
          {caption && (
            <p className="w-full md:flex-1 my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0" style={capCss}>{caption}</p>
          )}
        </div>
      );
    }

    // Fill (full-bleed / Manhattan bleed) → larger + square; Fit/centered → standard.
    const fill = bleed || variant === 1;
    return (
      <div className="w-full px-[10px] md:px-0">
        <div className="mx-auto w-full" style={{ maxWidth: fill ? 460 : 380 }}>
          {igFrame}
          {caption && (
            <p className="my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto" style={capCss}>{caption}</p>
          )}
        </div>
      </div>
    );
  }

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
            {/* Manhattan: caption inside on hover (same as photos), not below —
                desktop only; on mobile the caption sits beneath like every theme. */}
            {bleed && <HoverCaption caption={caption} captionStyle={captionStyle} />}
          </div>
          {caption && (
            <p {...(bleed ? { 'data-mobile-caption': '' } : {})} className={`${bleed ? 'min-[769px]:hidden ' : ''}my-4 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto`} style={capCss}>{caption}</p>
          )}
        </>
      )}
    </div>
  );
};

export default VideoBlock;
