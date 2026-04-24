import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PhotoTile from "./PhotoTile";
import AdminPhotoLightbox from "./AdminPhotoLightbox";

const GAP = 12;
const INFO_HEIGHT = 84; // px for caption input + filename + metadata strip
const PADDING = 16;     // container padding
const OVERSCAN = 800;   // px above/below viewport to keep rendered

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "largest", label: "Largest file" },
  { value: "smallest", label: "Smallest file" },
  { value: "most-used", label: "Most used" },
];

function getColumnCount(width) {
  if (width < 480) return 2;
  if (width < 720) return 3;
  if (width < 1024) return 4;
  if (width < 1400) return 5;
  return 6;
}

function computeLayout(assets, containerWidth) {
  if (!containerWidth || assets.length === 0) return { positions: [], totalHeight: 0 };
  const cols = getColumnCount(containerWidth);
  const colWidth = Math.floor((containerWidth - GAP * (cols - 1)) / cols);
  const colHeights = new Array(cols).fill(0);

  const positions = assets.map(asset => {
    const ratio = asset.width && asset.height ? asset.width / asset.height : 1.5;
    const imageHeight = Math.round(colWidth / ratio);
    const tileHeight = imageHeight + INFO_HEIGHT;
    const colIndex = colHeights.indexOf(Math.min(...colHeights));
    const x = colIndex * (colWidth + GAP);
    const y = colHeights[colIndex];
    colHeights[colIndex] += tileHeight + GAP;
    return { x, y, width: colWidth, height: tileHeight };
  });

  return { positions, totalHeight: Math.max(...colHeights) };
}

function formatAlbumLabel(selectedAlbum) {
  if (selectedAlbum.type === "all") return "All Photos";
  return selectedAlbum.key
    .split("-")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getSearchText(asset) {
  return [
    asset.originalFilename, asset.caption, asset.publicUrl,
    asset.source?.provider, asset.capture?.cameraModel, asset.capture?.lens,
    ...(asset.tags || []),
  ].filter(Boolean).join(" ").toLowerCase();
}

function getDateValue(v) {
  return v ? new Date(v).getTime() : 0;
}

export default function PhotoGrid({
  assets,
  selectedAlbum,
  collectionsByUrl,
  allCollections,
  onRemove,
  onDelete,
  onAddToAlbum,
  onCaptionChange,
  onToggleCollection,
  onUploadClick,
  onAddFromLibraryClick,
}) {
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const scrollRef = useRef(null);
  const rafRef = useRef(null);

  const inAlbum = selectedAlbum.type !== "all";
  const albumLabel = formatAlbumLabel(selectedAlbum);

  // Sort + search
  const processedAssets = useMemo(() => {
    let result = assets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => getSearchText(a).includes(q));
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case "newest": return getDateValue(b.createdAt || b.updatedAt) - getDateValue(a.createdAt || a.updatedAt);
        case "oldest": return getDateValue(a.createdAt || a.updatedAt) - getDateValue(b.createdAt || b.updatedAt);
        case "name-asc": return (a.originalFilename || "").localeCompare(b.originalFilename || "");
        case "name-desc": return (b.originalFilename || "").localeCompare(a.originalFilename || "");
        case "largest": return (b.bytes || 0) - (a.bytes || 0);
        case "smallest": return (a.bytes || 0) - (b.bytes || 0);
        case "most-used": return (b.usage?.usageCount || 0) - (a.usage?.usageCount || 0);
        default: return 0;
      }
    });
  }, [assets, sort, search]);

  // Masonry layout — recalculate when assets or container width changes
  const { positions, totalHeight } = useMemo(
    () => computeLayout(processedAssets, containerSize.width - PADDING * 2),
    [processedAssets, containerSize.width]
  );

  // Only render tiles in the visible window + overscan
  const visibleItems = useMemo(() => {
    const top = scrollTop - OVERSCAN;
    const bottom = scrollTop + containerSize.height + OVERSCAN;
    return positions
      .map((pos, i) => ({ ...pos, index: i }))
      .filter(pos => pos.y + pos.height > top && pos.y < bottom);
  }, [positions, scrollTop, containerSize.height]);

  // Scroll handler — throttled via rAF
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(scrollRef.current?.scrollTop ?? 0);
      rafRef.current = null;
    });
  }, []);

  // ResizeObserver for container dimensions
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset scroll when dataset changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [processedAssets]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-paper">
      {/* Header */}
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

      {/* Toolbar */}
      <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by filename, caption, camera, lens…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-rule rounded-lg px-3 py-1.5 text-sm text-ink-3 outline-none focus:border-ink-3 bg-paper"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Virtual masonry grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {processedAssets.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            {search ? "No photos match your search" : "No photos in this album"}
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              height: totalHeight + PADDING * 2,
              margin: `0 ${PADDING}px`,
            }}
          >
            {visibleItems.map(({ index, x, y, width, height }) => {
              const asset = processedAssets[index];
              return (
                <div
                  key={asset.assetId || asset.publicUrl}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y + PADDING,
                    width,
                    height,
                  }}
                >
                  <PhotoTile
                    asset={asset}
                    albumType={selectedAlbum.type}
                    onRemove={onRemove}
                    onDelete={onDelete}
                    onAddToAlbum={onAddToAlbum}
                    onCaptionChange={onCaptionChange}
                    onImageClick={() => setLightboxIndex(index)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <AdminPhotoLightbox
          images={processedAssets.map(a => ({
            url: a.publicUrl,
            caption: a.caption || '',
            originalFilename: a.originalFilename,
            bytes: a.bytes,
            width: a.width,
            height: a.height,
            source: a.source,
            capture: a.capture,
            usage: a.usage,
            orientation: a.orientation,
            assetId: a.assetId,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            collections: collectionsByUrl?.[a.publicUrl] || [],
          }))}
          allCollections={allCollections}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onCaptionChange={(i, newCaption) => {
            const asset = processedAssets[i];
            if (asset && onCaptionChange) onCaptionChange(asset.assetId, newCaption);
          }}
          onToggleCollection={(slug, type, add) => {
            const asset = processedAssets[lightboxIndex];
            if (asset && onToggleCollection) onToggleCollection(asset.publicUrl, slug, type, add);
          }}
        />
      )}
    </div>
  );
}
