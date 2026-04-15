import { useState, useMemo } from "react";

function extractFolder(url) {
  // "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/foo.jpg"
  // → "landscapes/arizona"
  const match = url.match(/\/photos\/(.+)\/[^/]+$/);
  return match ? match[1] : "other";
}

export default function GalleryLibraryPanel({ images, loading, onPhotoClick, activeBlockIndex }) {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");

  const folders = useMemo(() => {
    const set = new Set();
    images.forEach((url) => set.add(extractFolder(url)));
    return ["all", ...Array.from(set).sort()];
  }, [images]);

  const filtered = useMemo(() => {
    let result = images;
    if (folder !== "all") {
      result = result.filter((url) => extractFolder(url) === folder);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((url) => url.toLowerCase().includes(q));
    }
    return result;
  }, [images, folder, search]);

  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col h-full bg-gray-50">
      {/* Search + folder filter */}
      <div className="px-3 py-3 border-b border-gray-200 bg-white space-y-2 flex-shrink-0">
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400"
          placeholder="Search photos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white outline-none"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          {folders.map((f) => (
            <option key={f} value={f}>
              {f === "all" ? "All folders" : f}
            </option>
          ))}
        </select>
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeBlockIndex === null && (
          <div className="mx-2 mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-500">
            Click "+ Add Photos" on a Stacked or Masonry block to target it, then click photos to add them. You can also drag photos directly onto a block.
          </div>
        )}
        {loading ? (
          <div className="text-center text-gray-400 text-xs py-10">Loading photos…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-10">No photos found</div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filtered.map((url) => {
              const filename = url.split("/").pop();
              return (
                <div
                  key={url}
                  className="aspect-square rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", url)}
                  onClick={() => onPhotoClick(url)}
                  title={filename}
                >
                  <img
                    src={`/_next/image?url=${encodeURIComponent(url)}&w=200&q=65`}
                    alt={filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="text-xs text-gray-400">
          {filtered.length}
          {filtered.length !== images.length ? ` of ${images.length}` : ""} photos
        </div>
      </div>
    </div>
  );
}
