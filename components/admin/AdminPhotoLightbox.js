import { useEffect, useState } from "react";
import { getSizedUrl } from "../../common/imageUtils";

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-stone-400 flex-shrink-0 w-20">{label}</span>
      <span className="text-stone-700 truncate">{value}</span>
    </div>
  );
}

export default function AdminPhotoLightbox({ images, index, onClose, onNavigate, onCaptionChange }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [caption, setCaption] = useState(image?.caption || '');
  const [saved, setSaved] = useState(true);

  // Sync caption when navigating between images
  useEffect(() => {
    setCaption(image?.caption || '');
    setSaved(true);
  }, [index, image?.caption]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  const saveCaption = () => {
    if (caption !== (image?.caption || '') && onCaptionChange) {
      onCaptionChange(index, caption);
      setSaved(true);
    }
  };

  if (!image) return null;

  const filename = image.originalFilename || image.url?.split('/').pop();
  const sizeLabel = formatBytes(image.bytes);
  const camera = image.capture?.cameraModel;
  const lens = image.capture?.lens;
  const focalLength = image.capture?.focalLength ? `${image.capture.focalLength}mm` : null;
  const iso = image.capture?.iso ? `ISO ${image.capture.iso}` : null;
  const usageCount = image.usage?.usageCount;
  const source = image.source?.provider
    ? image.source.provider.charAt(0).toUpperCase() + image.source.provider.slice(1)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex"
      onClick={onClose}
    >
      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl leading-none px-2 z-10"
            onClick={() => onNavigate(index - 1)}
          >
            ‹
          </button>
        )}

        <img
          src={getSizedUrl(image.url, 'display')}
          alt={caption || ''}
          className="max-w-full max-h-full object-contain"
        />

        {hasNext && (
          <button
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl leading-none px-2 z-10"
            onClick={() => onNavigate(index + 1)}
          >
            ›
          </button>
        )}

        <div className="absolute bottom-4 text-white/30 text-xs">
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Metadata panel */}
      <div
        className="w-64 bg-white flex flex-col flex-shrink-0 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">Info</span>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4 space-y-5 flex-1">
          {/* Caption */}
          <div>
            <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">
              Caption
            </label>
            <textarea
              value={caption}
              rows={3}
              placeholder="Add a caption…"
              className="w-full text-sm text-stone-700 border border-stone-200 rounded px-2.5 py-2 outline-none focus:border-stone-400 placeholder-stone-300 resize-none"
              onChange={(e) => { setCaption(e.target.value); setSaved(false); }}
              onBlur={saveCaption}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); } }}
            />
            {!saved && (
              <p className="text-[10px] text-stone-400 mt-1">Press Enter or click away to save</p>
            )}
          </div>

          {/* File info */}
          {(filename || sizeLabel || source) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">File</p>
              <MetaRow label="Name" value={filename} />
              <MetaRow label="Size" value={sizeLabel} />
              <MetaRow label="Source" value={source} />
              <MetaRow label="Used in" value={usageCount > 0 ? `${usageCount} place${usageCount !== 1 ? 's' : ''}` : null} />
            </div>
          )}

          {/* Camera info */}
          {(camera || lens || focalLength || iso) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Camera</p>
              <MetaRow label="Camera" value={camera} />
              <MetaRow label="Lens" value={lens} />
              <MetaRow label="Focal" value={focalLength} />
              <MetaRow label="ISO" value={iso} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
