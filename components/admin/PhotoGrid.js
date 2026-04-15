import { useState, useMemo } from "react";
import PhotoTile from "./PhotoTile";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "largest", label: "Largest file" },
  { value: "smallest", label: "Smallest file" },
];

export default function PhotoGrid({
  images,
  metadata,
  selectedAlbum,
  onRemove,
  onDelete,
  onAddToAlbum,
  onUploadClick,
  onAddFromLibraryClick,
}) {
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const inAlbum = selectedAlbum.type !== "all";
  const albumLabel =
    selectedAlbum.type === "all"
      ? "All Photos"
      : selectedAlbum.key.charAt(0).toUpperCase() + selectedAlbum.key.slice(1);

  const processedImages = useMemo(() => {
    let result = images;

    // Filter by search (matches filename or path)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((url) => url.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const ma = metadata[a] || {};
      const mb = metadata[b] || {};
      switch (sort) {
        case "newest":
          return new Date(mb.timeCreated || 0) - new Date(ma.timeCreated || 0);
        case "oldest":
          return new Date(ma.timeCreated || 0) - new Date(mb.timeCreated || 0);
        case "name-asc":
          return (ma.name || a).localeCompare(mb.name || b);
        case "name-desc":
          return (mb.name || b).localeCompare(ma.name || a);
        case "largest":
          return (mb.size || 0) - (ma.size || 0);
        case "smallest":
          return (ma.size || 0) - (mb.size || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [images, metadata, sort, search]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
        <div>
          <div className="font-semibold text-gray-900 text-base">{albumLabel}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {processedImages.length}{images.length !== processedImages.length ? ` of ${images.length}` : ""} photo{images.length !== 1 ? "s" : ""}
            {selectedAlbum.type !== "all" && ` · ${selectedAlbum.type === "portfolio" ? "Portfolio" : "Gallery"}`}
          </div>
        </div>
        <div className="flex-1" />
        {inAlbum && (
          <button
            onClick={onAddFromLibraryClick}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            + Add from Library
          </button>
        )}
        <button
          onClick={onUploadClick}
          className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ↑ Upload
        </button>
      </div>

      {/* Filter / sort toolbar */}
      <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by filename or path…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 outline-none focus:border-gray-400 bg-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {processedImages.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            {search ? "No photos match your search" : "No photos in this album"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {processedImages.map((url) => (
              <PhotoTile
                key={url}
                imageUrl={url}
                metadata={metadata[url]}
                albumType={selectedAlbum.type}
                albumKey={selectedAlbum.key}
                onRemove={onRemove}
                onDelete={onDelete}
                onAddToAlbum={onAddToAlbum}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
