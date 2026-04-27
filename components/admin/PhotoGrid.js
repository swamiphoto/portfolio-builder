import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PhotoTile from "./PhotoTile";
import AdminPhotoLightbox from "./AdminPhotoLightbox";

const GAP = 12;
const INFO_HEIGHT = 96;
const PADDING = 16;
const OVERSCAN = 800;
const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';

const SORT_OPTIONS = [
  { value: "newest-capture", label: "Newest capture" },
  { value: "oldest-capture", label: "Oldest capture" },
  { value: "newest-upload",  label: "Newest upload" },
  { value: "oldest-upload",  label: "Oldest upload" },
  { value: "name-asc",       label: "Name A → Z" },
  { value: "name-desc",      label: "Name Z → A" },
  { value: "most-used",      label: "Most used" },
];

function getColumnCount(width) {
  if (width < 480)  return 2;
  if (width < 720)  return 3;
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

function slugToTitle(slug) {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildBreadcrumb(selectedAlbum) {
  if (selectedAlbum.type === "all") return null;
  const parts = selectedAlbum.key.split("/");
  return parts.map((part, i) => ({
    label: slugToTitle(part),
    key: parts.slice(0, i + 1).join("/"),
    type: selectedAlbum.type,
    isLast: i === parts.length - 1,
  }));
}

function getSearchText(asset) {
  const c = asset.capture || {};
  const year = c.capturedAt ? String(new Date(c.capturedAt).getFullYear()) : '';
  const focalMm = c.focalLengthMm ? `${Math.round(c.focalLengthMm)}mm` : '';
  const isoStr = c.iso ? `iso${c.iso} iso ${c.iso}` : '';
  const aperture = c.aperture ? String(c.aperture).replace(/^[fFƒ]\/?/, 'f/') : '';
  return [
    asset.originalFilename, asset.caption,
    c.cameraModel, c.lens,
    asset.orientation,
    year, focalMm, isoStr, aperture,
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
  activeFilters = [],
  onRemoveFilter,
  allAssets,
  onAlbumSelect,
  onClose,
}) {
  const [sort, setSort] = useState("newest-capture");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const searchRef = useRef(null);

  const inAlbum = selectedAlbum.type !== "all";
  const breadcrumb = buildBreadcrumb(selectedAlbum);

  // Autocomplete suggestion pool — deduplicated across all library assets
  const suggestionPool = useMemo(() => {
    const pool = new Set();
    for (const asset of (allAssets || assets)) {
      const c = asset.capture || {};
      if (c.cameraModel) pool.add(c.cameraModel);
      if (c.lens) pool.add(c.lens);
      if (c.capturedAt) pool.add(String(new Date(c.capturedAt).getFullYear()));
      for (const tag of (asset.tags || [])) pool.add(tag);
    }
    return Array.from(pool);
  }, [allAssets, assets]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return suggestionPool.filter(s => s.toLowerCase().includes(q)).slice(0, 6);
  }, [search, suggestionPool]);

  const showSuggestions = searchFocused && suggestions.length > 0;

  // Sort + search
  const processedAssets = useMemo(() => {
    let result = assets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => getSearchText(a).includes(q));
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case "newest-capture": return getDateValue(b.capture?.capturedAt) - getDateValue(a.capture?.capturedAt);
        case "oldest-capture": return getDateValue(a.capture?.capturedAt) - getDateValue(b.capture?.capturedAt);
        case "newest-upload":  return getDateValue(b.createdAt) - getDateValue(a.createdAt);
        case "oldest-upload":  return getDateValue(a.createdAt) - getDateValue(b.createdAt);
        case "name-asc":       return (a.originalFilename || "").localeCompare(b.originalFilename || "");
        case "name-desc":      return (b.originalFilename || "").localeCompare(a.originalFilename || "");
        case "most-used":      return (b.usage?.usageCount || 0) - (a.usage?.usageCount || 0);
        default: return 0;
      }
    });
  }, [assets, sort, search]);

  const { positions, totalHeight } = useMemo(
    () => computeLayout(processedAssets, containerSize.width - PADDING * 2),
    [processedAssets, containerSize.width]
  );

  const visibleItems = useMemo(() => {
    const top = scrollTop - OVERSCAN;
    const bottom = scrollTop + containerSize.height + OVERSCAN;
    return positions
      .map((pos, i) => ({ ...pos, index: i }))
      .filter(pos => pos.y + pos.height > top && pos.y < bottom);
  }, [positions, scrollTop, containerSize.height]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(scrollRef.current?.scrollTop ?? 0);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [processedAssets]);

  const applySuggestion = useCallback((s) => {
    setSearch(s);
    setSearchFocused(false);
    setSuggestionIndex(-1);
    searchRef.current?.blur();
  }, []);

  const handleSearchKey = useCallback((e) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSuggestionIndex(i => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && suggestionIndex >= 0) { e.preventDefault(); applySuggestion(suggestions[suggestionIndex]); }
    if (e.key === "Escape") { setSearchFocused(false); setSuggestionIndex(-1); }
  }, [showSuggestions, suggestions, suggestionIndex, applySuggestion]);

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, cursor: 'pointer', transition: 'background 0.15s',
  };

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'transparent' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4"
        style={{
          height: 48,
          flexShrink: 0,
          boxShadow: 'inset 0 -1px 0 rgba(160,140,110,0.18)',
          background: '#efeae1',
        }}
      >
        {/* Left — label + count + filter chips */}
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          {!breadcrumb ? (
            <span style={{ fontWeight: 500, fontSize: 14, color: '#2c2416', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              All Photos
            </span>
          ) : (
            <div className="flex items-center min-w-0 overflow-hidden" style={{ gap: 4 }}>
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.key} className="flex items-center" style={{ gap: 4, minWidth: 0 }}>
                  {i > 0 && (
                    <span style={{ color: '#a8967a', fontSize: 16, flexShrink: 0, lineHeight: 1 }}>›</span>
                  )}
                  {crumb.isLast ? (
                    <span style={{ fontWeight: 500, fontSize: 14, color: '#2c2416', whiteSpace: 'nowrap', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => onAlbumSelect?.({ type: crumb.type, key: crumb.key })}
                      className="transition-colors"
                      style={{ fontWeight: 400, fontSize: 14, color: '#a8967a', whiteSpace: 'nowrap', letterSpacing: '-0.01em', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
                      onMouseLeave={e => e.currentTarget.style.color = '#a8967a'}
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <span style={{ fontSize: 11, color: '#b0a490', whiteSpace: 'nowrap', fontFamily: MONO, letterSpacing: '0.02em' }}>
            {processedAssets.length}
            {assets.length !== processedAssets.length ? `/${assets.length}` : ""}
          </span>

          {activeFilters.length > 0 && (
            <span style={{ color: 'rgba(160,140,110,0.4)', fontSize: 11, margin: '0 1px' }}>·</span>
          )}

          {/* Filter chips — show first 3, then overflow */}
          {activeFilters.slice(0, 3).map(f => (
            <button
              key={f.key}
              onClick={() => onRemoveFilter?.(f.key)}
              className="flex items-center gap-0.5 flex-shrink-0 transition-colors"
              style={{
                fontFamily: MONO,
                fontSize: 9.5,
                letterSpacing: '0.04em',
                padding: '2px 5px 2px 7px',
                borderRadius: 3,
                background: 'rgba(139,111,71,0.1)',
                border: '1px solid rgba(139,111,71,0.22)',
                color: '#5c4f3a',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,111,71,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,111,71,0.1)'}
            >
              {f.label}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" style={{ opacity: 0.5, marginLeft: 1 }}>
                <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
              </svg>
            </button>
          ))}
          {activeFilters.length > 3 && (
            <button
              onClick={() => activeFilters.forEach(f => onRemoveFilter?.(f.key))}
              className="flex-shrink-0 transition-colors"
              style={{
                fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.04em',
                padding: '2px 6px', borderRadius: 3,
                background: 'rgba(139,111,71,0.08)',
                border: '1px solid rgba(139,111,71,0.18)',
                color: '#8b7a62',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,111,71,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,111,71,0.08)'}
            >
              +{activeFilters.length - 3} more ×
            </button>
          )}
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Expandable search */}
          <div className="relative">
            <div
              className="flex items-center"
              style={{
                height: 28,
                width: searchFocused || search ? 240 : 140,
                transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderRadius: 4,
                border: searchFocused ? '1px solid rgba(139,111,71,0.4)' : '1px solid rgba(160,140,110,0.25)',
                background: '#efeae1',
                overflow: 'hidden',
              }}
            >
              <div
                style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0a490' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSuggestionIndex(-1); }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={handleSearchKey}
                className="outline-none bg-transparent flex-1 min-w-0"
                style={{
                  fontSize: 11,
                  fontFamily: MONO,
                  color: '#2c2416',
                  paddingRight: search ? 0 : 8,
                  letterSpacing: '0.01em',
                }}
              />
              {search && (
                <button
                  onMouseDown={e => { e.preventDefault(); setSearch(''); setSuggestionIndex(-1); }}
                  style={{ width: 22, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0a490' }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && (
              <div
                className="absolute left-0 z-20 rounded-lg overflow-hidden"
                style={{
                  top: '100%', marginTop: 4, minWidth: 220,
                  background: '#f9f6f1',
                  boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 4px 12px rgba(26,18,10,0.12)',
                  padding: '4px 0',
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      fontFamily: MONO,
                      color: i === suggestionIndex ? '#2c2416' : '#5c4f3a',
                      background: i === suggestionIndex ? 'rgba(139,111,71,0.1)' : 'transparent',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.05)'; setSuggestionIndex(i); }}
                    onMouseLeave={e => { e.currentTarget.style.background = i === suggestionIndex ? 'rgba(139,111,71,0.1)' : 'transparent'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="outline-none"
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: '0.04em',
              padding: '5px 28px 5px 8px',
              height: 28,
              border: '1px solid rgba(160,140,110,0.25)',
              borderRadius: 4,
              backgroundColor: '#efeae1',
              color: '#5c4f3a',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3.5l3 3 3-3' stroke='%23a8967a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Add from Library */}
          {inAlbum && (
            <button
              onClick={onAddFromLibraryClick}
              className="transition-colors"
              style={{
                ...btnBase,
                fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '0 10px', height: 28,
                border: '1px solid rgba(160,140,110,0.3)',
                background: 'transparent', color: '#7a6b55',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              + Add
            </button>
          )}

          {/* Upload */}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em',
              padding: '0 12px', height: 28,
              background: '#2c2416', color: '#f4efe8',
              borderRadius: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#3d3020'}
            onMouseLeave={e => e.currentTarget.style.background = '#2c2416'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                color: '#7a6b55', background: 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Virtual masonry grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-quiet"
        style={{ background: 'var(--desk)' }}
        onScroll={handleScroll}
      >
        {processedAssets.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#a8967a', fontFamily: MONO, fontSize: 11 }}>
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
                  style={{ position: "absolute", left: x, top: y + PADDING, width, height }}
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
