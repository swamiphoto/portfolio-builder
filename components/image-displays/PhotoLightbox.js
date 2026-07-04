import { useEffect, useState } from "react";
import { getSizedUrl } from "../../common/imageUtils";
import PrintAffordance from "./print/PrintAffordance";
import PrintPurchasePanel from "./print/PrintPurchasePanel";
import FramedImage from "./print/FramedImage";

function defaultSpec(print) {
  const size = print?.maxSharpSize || (print?.availableSizes || [])[0] || null;
  return { size, finish: 'lustre', frame: 'none', frameColor: null, matte: false };
}

export default function PhotoLightbox({ images, index, onClose, onNavigate, printStore }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const sellable = !!(printStore?.enabled && image?.print?.sellable);
  const [panelOpen, setPanelOpen] = useState(false);
  const [spec, setSpec] = useState(defaultSpec(image?.print));

  // Reset the print UI when the viewed image changes.
  useEffect(() => {
    setPanelOpen(false);
    setSpec(defaultSpec(image?.print));
  }, [index, image?.url]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div
        className="flex flex-col md:flex-row items-center gap-6 max-w-[92vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          {sellable ? (
            <FramedImage src={getSizedUrl(image.url, 'display')} alt={image.caption || ''} spec={spec} className="max-w-full max-h-[80vh] object-contain" />
          ) : (
            <img src={getSizedUrl(image.url, 'display')} alt={image.caption || ''} className="max-w-full max-h-[80vh] object-contain" />
          )}
          {image.caption && (
            <p className="mt-3 text-white/70 text-sm italic text-center max-w-xl">{image.caption}</p>
          )}
          {sellable && !panelOpen && (
            <PrintAffordance print={image.print} printStore={printStore} onOpen={() => setPanelOpen(true)} />
          )}
        </div>

        {sellable && panelOpen && (
          <PrintPurchasePanel print={image.print} printStore={printStore} spec={spec} onSpecChange={setSpec} onClose={() => setPanelOpen(false)} />
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
