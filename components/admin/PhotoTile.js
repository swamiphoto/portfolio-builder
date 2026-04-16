import { useState, useRef, useEffect } from "react";

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatSourceLabel(source) {
  if (!source?.provider) return null;
  return source.provider.charAt(0).toUpperCase() + source.provider.slice(1);
}

export default function PhotoTile({ asset, albumType, onRemove, onDelete, onAddToAlbum }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const imageUrl = asset.publicUrl;
  const filename = asset.originalFilename || imageUrl.split("/").pop();
  const inAlbum = albumType !== "all";
  const sizeLabel = formatBytes(asset.bytes);
  const sourceLabel = formatSourceLabel(asset.source);
  const usageCount = asset.usage?.usageCount || 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  return (
    <div className="relative mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm border border-gray-100 group bg-white">
      <div className="relative bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={asset.caption || filename}
          className="block w-full h-auto"
          loading="lazy"
        />
      </div>

      <button
        onClick={() => setMenuOpen((value) => !value)}
        className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ⋯
      </button>

      <div className="px-2.5 py-2 bg-white space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="truncate flex-1">{filename}</span>
          {sizeLabel && <span className="text-gray-300 flex-shrink-0">{sizeLabel}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          {sourceLabel && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-500">{sourceLabel}</span>}
          {usageCount > 0 && <span>{usageCount} use{usageCount !== 1 ? "s" : ""}</span>}
          {asset.orientation && asset.orientation !== "unknown" && <span>{asset.orientation}</span>}
        </div>
        {asset.caption && <div className="text-xs text-gray-500">{asset.caption}</div>}
      </div>

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
