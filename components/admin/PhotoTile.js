import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export default function PhotoTile({ imageUrl, metadata, albumType, albumKey, onRemove, onDelete, onCopyUrl, onAddToAlbum }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const filename = imageUrl.split("/").pop();
  const inAlbum = albumType !== "all";

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(imageUrl);
    setMenuOpen(false);
  };

  const handleRemove = () => {
    setMenuOpen(false);
    onRemove(imageUrl);
  };

  const handleDelete = () => {
    if (!confirm(`Permanently delete ${filename} from GCS? This cannot be undone.`)) return;
    setMenuOpen(false);
    onDelete(imageUrl);
  };

  const handleAddToAlbum = () => {
    setMenuOpen(false);
    onAddToAlbum(imageUrl);
  };

  const sizeLabel = metadata?.size
    ? metadata.size > 1024 * 1024
      ? `${(metadata.size / 1024 / 1024).toFixed(1)} MB`
      : `${(metadata.size / 1024).toFixed(0)} KB`
    : null;

  return (
    <div className="relative rounded-lg overflow-hidden shadow-sm border border-gray-100 group">
      {/* Thumbnail via Next.js Image (auto-resized + cached) */}
      <div className="relative w-full aspect-square bg-gray-100">
        <Image
          src={imageUrl}
          alt={filename}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
          loading="lazy"
        />
      </div>

      {/* ⋯ menu button */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ⋯
      </button>

      {/* filename + size label */}
      <div className="px-2 py-1 text-xs text-gray-500 bg-white flex items-center gap-1">
        <span className="truncate flex-1">{filename}</span>
        {sizeLabel && <span className="text-gray-300 flex-shrink-0">{sizeLabel}</span>}
      </div>

      {/* context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-8 right-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-20"
        >
          <button
            onClick={handleCopy}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Copy URL
          </button>
          <button
            onClick={handleAddToAlbum}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add to another album
          </button>
          {inAlbum && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleRemove}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50"
              >
                Remove from album
              </button>
            </>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 font-medium"
          >
            Delete permanently
          </button>
        </div>
      )}
    </div>
  );
}
