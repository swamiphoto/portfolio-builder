import { useEffect, useState } from "react";
import { getSizedUrl } from "../../common/imageUtils";
import { useIsMobile } from "../../common/useIsMobile";
import BuyPrintButton from "./print/BuyPrintButton";
import EngagementActions from "./engagement/EngagementActions";
import WatermarkOverlay from "./engagement/WatermarkOverlay";

export default function PhotoLightbox({ images, index, onClose, onNavigate, printStore }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const sellable = !!(printStore?.enabled && image?.print?.sellable);
  const [hovering, setHovering] = useState(false);
  const [peek, setPeek] = useState(true);
  const isMobile = useIsMobile();
  // Touch devices have no hover, so keep the CTAs always visible in the lightbox.
  const showCtas = isMobile || hovering || peek;

  // Show the buy button briefly when a new image opens, then let it fade until
  // the viewer hovers the image.
  useEffect(() => {
    setPeek(true);
    const t = setTimeout(() => setPeek(false), 2600);
    return () => clearTimeout(t);
  }, [index, image?.url]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="lightbox-backdrop"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        aria-label="Close lightbox"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-3xl leading-none focus:outline-none focus-visible:outline-none"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ×
      </button>

      {hasPrev && (
        <button
          aria-label="Previous image"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          ‹
        </button>
      )}

      {/* Image + caption — stop propagation so clicking image doesn't close */}
      <div
        className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <img
            src={getSizedUrl(image.url, 'display')}
            alt={image.caption || ""}
            className="max-w-full max-h-[80vh] object-contain"
          />
          {sellable && (
            <div
              className="absolute top-3 right-3 transition-opacity duration-500"
              style={{ opacity: showCtas ? 1 : 0, pointerEvents: showCtas ? 'auto' : 'none' }}
            >
              <BuyPrintButton print={image.print} imageUrl={image.url} />
            </div>
          )}
          <WatermarkOverlay />
          <div
            className="absolute top-3 left-3 transition-opacity duration-500"
            style={{ opacity: showCtas ? 1 : 0, pointerEvents: showCtas ? 'auto' : 'none' }}
          >
            <EngagementActions imageUrl={image.url} />
          </div>
        </div>
        {image.caption && (
          <p className="mt-3 text-white/70 text-sm italic text-center max-w-xl">{image.caption}</p>
        )}
      </div>

      {hasNext && (
        <button
          aria-label="Next image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          ›
        </button>
      )}

      <div className="absolute bottom-4 text-white/40 text-xs">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
