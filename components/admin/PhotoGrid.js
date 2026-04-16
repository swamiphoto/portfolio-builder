import { useState, useMemo } from "react";
import PhotoTile from "./PhotoTile";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "largest", label: "Largest file" },
  { value: "smallest", label: "Smallest file" },
  { value: "most-used", label: "Most used" },
];

function formatAlbumLabel(selectedAlbum) {
  if (selectedAlbum.type === "all") return "All Photos";
  return selectedAlbum.key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSearchText(asset) {
  return [
    asset.originalFilename,
    asset.caption,
    asset.publicUrl,
    asset.source?.provider,
    ...(asset.tags || []),
    ...(asset.collectionIds || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDateValue(value) {
  return value ? new Date(value).getTime() : 0;
}

export default function PhotoGrid({
  assets,
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
  const albumLabel = formatAlbumLabel(selectedAlbum);

  const processedAssets = useMemo(() => {
    let result = assets;

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((asset) => getSearchText(asset).includes(query));
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "newest":
          return getDateValue(b.createdAt || b.updatedAt) - getDateValue(a.createdAt || a.updatedAt);
        case "oldest":
          return getDateValue(a.createdAt || a.updatedAt) - getDateValue(b.createdAt || b.updatedAt);
        case "name-asc":
          return (a.originalFilename || a.publicUrl).localeCompare(b.originalFilename || b.publicUrl);
        case "name-desc":
          return (b.originalFilename || b.publicUrl).localeCompare(a.originalFilename || a.publicUrl);
        case "largest":
          return (b.bytes || 0) - (a.bytes || 0);
        case "smallest":
          return (a.bytes || 0) - (b.bytes || 0);
        case "most-used":
          return (b.usage?.usageCount || 0) - (a.usage?.usageCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [assets, sort, search]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
        <div>
          <div className="font-semibold text-gray-900 text-base">{albumLabel}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {processedAssets.length}
            {assets.length !== processedAssets.length ? ` of ${assets.length}` : ""}
            {` photo${assets.length !== 1 ? "s" : ""}`}
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

      <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by filename, caption, tag, or source…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 outline-none focus:border-gray-400 bg-white"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {processedAssets.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            {search ? "No photos match your search" : "No photos in this album"}
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
            {processedAssets.map((asset) => (
              <PhotoTile
                key={asset.assetId || asset.publicUrl}
                asset={asset}
                albumType={selectedAlbum.type}
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
