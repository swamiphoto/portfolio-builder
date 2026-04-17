import { useEffect } from "react";
import { getSizedUrl } from "../../common/imageUtils";

export default function PhotoLightbox({ images, index, onClose, onNavigate }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

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
      {/* Close */}
      <button
        aria-label="Close lightbox"
        autoFocus
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-3xl leading-none"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ×
      </button>

      {/* Prev */}
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
        <img
          src={getSizedUrl(image.url, 'display')}
          alt={image.caption || ""}
          className="max-w-full max-h-[80vh] object-contain"
        />
        {image.caption && (
          <p className="mt-3 text-white/70 text-sm italic text-center max-w-xl">{image.caption}</p>
        )}
      </div>

      {/* Next */}
      {hasNext && (
        <button
          aria-label="Next image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          ›
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 text-white/40 text-xs">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
