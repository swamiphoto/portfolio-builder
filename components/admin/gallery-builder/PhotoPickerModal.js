import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { normalizeImageRef } from "../../../common/assetRefs";
import { getSizedUrl } from "../../../common/imageUtils";
import { applyFilters, computeFilterCounts, placeholderColor } from "../../../common/libraryFilters";
import PickerFilterRail from "./PickerFilterRail";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';

const RAIL_COLLAPSED_W = 36;
const RAIL_EXPANDED_W = 240;
const PICKER_BASE_W = 420;

const PICKER_COLUMNS = 3;
const PICKER_GAP = 6;
const PICKER_PADDING = 10;
const PICKER_OVERSCAN = 300;

function computePickerLayout(assets, containerWidth) {
  if (!containerWidth || assets.length === 0) return { positions: [], totalHeight: 0 };
  const colWidth = Math.floor((containerWidth - PICKER_PADDING * 2 - PICKER_GAP * (PICKER_COLUMNS - 1)) / PICKER_COLUMNS);
  const colHeights = new Array(PICKER_COLUMNS).fill(0);
  const positions = assets.map(asset => {
    const ratio = asset.width && asset.height ? asset.width / asset.height : 1.5;
    const height = Math.round(colWidth / ratio);
    const colIndex = colHeights.indexOf(Math.min(...colHeights));
    const x = PICKER_PADDING + colIndex * (colWidth + PICKER_GAP);
    const y = colHeights[colIndex];
    colHeights[colIndex] += height + PICKER_GAP;
    return { x, y, width: colWidth, height };
  });
  return { positions, totalHeight: Math.max(...colHeights) };
}

function normalizePickerAsset(image) {
  const ref = normalizeImageRef(image);
  if (typeof image === "string" && ref) {
    return {
      assetId: ref.assetId,
      publicUrl: ref.url,
      originalFilename: ref.url.split("/").pop() || ref.url,
      caption: "",
      tags: [],
      collectionIds: [],
      source: { provider: "manual", type: "upload" },
      orientation: "unknown",
      usage: { usageCount: 0 },
      createdAt: null,
      updatedAt: null,
      capture: null,
    };
  }

  if (!image || typeof image !== "object" || !image.publicUrl) return null;

  return {
    assetId: image.assetId || image.publicUrl,
    publicUrl: image.publicUrl,
    originalFilename: image.originalFilename || image.publicUrl.split("/").pop() || image.publicUrl,
    caption: image.caption || "",
    tags: image.tags || [],
    collectionIds: image.collectionIds || [],
    source: image.source || { provider: "manual", type: "upload" },
    orientation: image.orientation || "unknown",
    usage: image.usage || { usageCount: 0 },
    createdAt: image.createdAt || null,
    updatedAt: image.updatedAt || null,
    width: image.width || null,
    height: image.height || null,
    capture: image.capture || null,
  };
}

// EXIF formatters (mirrors PhotoTile)
function formatAperture(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (s.startsWith('f/') || s.startsWith('ƒ/')) return s.replace('ƒ', 'f');
  const f = parseFloat(s);
  return isNaN(f) ? null : `f/${f}`;
}
function formatShutter(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (s.includes('/')) return `${s}s`;
  const f = parseFloat(s);
  if (isNaN(f)) return null;
  if (f >= 1) return `${f}s`;
  return `1/${Math.round(1/f)}s`;
}
function formatFocal(v) {
  if (!v) return null;
  const f = parseFloat(v);
  return isNaN(f) ? null : `${Math.round(f)}mm`;
}
function shortenCamera(v) {
  if (!v) return null;
  return String(v)
    .replace(/^Canon\s+EOS\s*/i, '')
    .replace(/^Nikon\s+/i, '')
    .replace(/^Sony\s+/i, '')
    .replace(/^Apple\s+/i, '')
    .trim() || null;
}
function shortenLens(v) {
  if (!v) return null;
  return String(v)
    .replace(/\s+\d+\.?\d*mm\s+f\/[\d.]+/i, '')
    .replace(/^Canon\s+(EF|RF)\s*/i, '')
    .replace(/^Sigma\s+/i, '')
    .replace(/^Sony\s+/i, '')
    .replace(/^Apple\s+/i, '')
    .trim() || null;
}

// ── Picker Tile ─────────────────────────────────────────────────────────────
function PickerTile({ asset, isSelected, onToggle, onPreview }) {
  const [loaded, setLoaded] = useState(false);
  const c = asset.capture || {};
  const camera = shortenCamera(c.cameraModel || (c.cameraMake && c.cameraModel ? `${c.cameraMake} ${c.cameraModel}` : null));
  const lens = shortenLens(c.lens || c.lensModel);
  const focal = formatFocal(c.focalLength || c.focalLengthMm);
  const aperture = formatAperture(c.aperture || c.fNumber);
  const shutter = formatShutter(c.shutterSpeed || c.exposureTime);
  const iso = c.iso ? `ISO${c.iso}` : null;
  const settings = [focal, aperture, shutter, iso].filter(Boolean);
  const hasOverlayInfo = asset.caption || camera || lens || settings.length > 0;

  const ratio = asset.width && asset.height ? `${asset.width} / ${asset.height}` : '3 / 2';

  return (
    <div
      onClick={onToggle}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", asset.publicUrl)}
      className="group relative cursor-pointer overflow-hidden break-inside-avoid mb-1.5 transition-all"
      style={{
        aspectRatio: ratio,
        background: placeholderColor(asset.assetId),
        boxShadow: isSelected
          ? '0 0 0 2px #8b6f47, 0 4px 12px rgba(60,40,15,0.16)'
          : '0 0 0 1px rgba(26,18,10,0.06), 0 1px 3px rgba(26,18,10,0.05)',
        borderRadius: 4,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getSizedUrl(asset.publicUrl, 'thumbnail')}
        alt={asset.caption || asset.originalFilename}
        className="w-full h-full object-cover transition-opacity"
        style={{ opacity: loaded ? 1 : 0 }}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => { if (e.target.src !== asset.publicUrl) e.target.src = asset.publicUrl }}
      />

      {/* Preview (eye) — top-right, hover-only */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview && onPreview(); }}
        title="Preview"
        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
        style={{
          background: 'rgba(20,12,4,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Selection check — top-right */}
      {isSelected && (
        <div
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: '#8b6f47', boxShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5L7 12l6-7" />
          </svg>
        </div>
      )}

      {/* Hover overlay — caption + EXIF */}
      {hasOverlayInfo && (
        <div
          className="absolute left-0 right-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            padding: '14px 6px 5px',
            background: 'linear-gradient(to top, rgba(20,12,4,0.85) 0%, rgba(20,12,4,0.55) 60%, rgba(20,12,4,0) 100%)',
          }}
        >
          {asset.caption && (
            <div className="truncate" style={{ fontSize: 10.5, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', color: '#fdf8ec', lineHeight: 1.25 }}>
              {asset.caption}
            </div>
          )}
          {(camera || lens) && (
            <div className="truncate" style={{ fontSize: 8.5, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(253,248,236,0.85)', marginTop: asset.caption ? 1 : 0 }}>
              {[camera, lens].filter(Boolean).join(' · ')}
            </div>
          )}
          {settings.length > 0 && (
            <div className="truncate" style={{ fontSize: 9, fontFamily: MONO, color: 'rgba(253,248,236,0.7)', marginTop: 1 }}>
              {settings.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Library tab ─────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  orientation: "all",
  usage: "all",
  captureYear: "all",
  uploaded: "all",
  camera: "all",
  lens: "all",
  focalLength: "all",
  aperture: "all",
  shutter: "all",
  iso: "all",
};

function LibraryTab({ images, loading, blockType, onConfirm, libraryConfig, railCollapsed, onToggleRail, onPreview }) {
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef(null);
  const gridScrollRef = useRef(null);
  const gridRafRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const isMulti = blockType === "photos" || blockType === "stacked" || blockType === "masonry";

  const allAssets = useMemo(
    () => (images || []).map(normalizePickerAsset).filter(Boolean),
    [images]
  );

  // Counts over the full set — sidebar shows full options regardless of current filters
  const counts = useMemo(() => computeFilterCounts(allAssets), [allAssets]);

  // Collection counts: { all: total, "<gallery key>": count }
  const collectionCounts = useMemo(() => {
    const galleries = libraryConfig?.galleries || {};
    const out = { all: allAssets.length };
    Object.keys(galleries).forEach(slug => {
      out[slug] = (galleries[slug] || []).length;
    });
    return out;
  }, [libraryConfig, allAssets.length]);

  // Filter by selected collection (gallery)
  const collectionAssets = useMemo(() => {
    if (collection === "all") return allAssets;
    if (libraryConfig?.galleries) {
      const prefix = collection + '/';
      const matchingKeys = Object.keys(libraryConfig.galleries).filter(
        (k) => k === collection || k.startsWith(prefix)
      );
      const urls = new Set(matchingKeys.flatMap((k) => libraryConfig.galleries[k] || []));
      return allAssets.filter((a) => urls.has(a.publicUrl));
    }
    return allAssets.filter((a) => (a.collectionIds || []).includes(collection));
  }, [allAssets, collection, libraryConfig]);

  // Apply attribute filters + search
  const filtered = useMemo(() => {
    let result = applyFilters(collectionAssets, filters);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => {
        const hay = [
          a.originalFilename, a.caption, a.publicUrl,
          a.source?.provider,
          a.capture?.cameraModel, a.capture?.lens,
          ...(a.tags || []), ...(a.collectionIds || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return [...result].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [collectionAssets, filters, search]);

  const { positions, totalHeight } = useMemo(
    () => computePickerLayout(filtered, containerSize.width),
    [filtered, containerSize.width]
  );

  const visibleItems = useMemo(() => {
    const top = scrollTop - PICKER_OVERSCAN;
    const bottom = scrollTop + containerSize.height + PICKER_OVERSCAN;
    return positions
      .map((pos, i) => ({ ...pos, index: i }))
      .filter(pos => pos.y + pos.height > top && pos.y < bottom);
  }, [positions, scrollTop, containerSize.height]);

  const toggle = (asset) => {
    const ref = normalizeImageRef({ assetId: asset.assetId, url: asset.publicUrl });
    const key = asset.assetId || asset.publicUrl;
    if (!isMulti) {
      onConfirm(ref ? [ref] : []);
      return;
    }
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  function clearAll() {
    setFilters(DEFAULT_FILTERS);
    setCollection('all');
  }

  // Autocomplete suggestions — distinct values from caption / filename / camera / lens / collections
  const suggestionPool = useMemo(() => {
    const set = new Set();
    allAssets.forEach((a) => {
      if (a.caption) set.add(a.caption);
      if (a.originalFilename) set.add(a.originalFilename);
      if (a.capture?.cameraModel) set.add(a.capture.cameraModel);
      if (a.capture?.lens) set.add(a.capture.lens);
      (a.tags || []).forEach((t) => set.add(t));
    });
    if (libraryConfig?.galleries) Object.keys(libraryConfig.galleries).forEach((s) => set.add(s));
    return Array.from(set);
  }, [allAssets, libraryConfig]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const matches = suggestionPool
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 8);
    return matches;
  }, [suggestionPool, search]);

  // Click-outside to close suggestions
  useEffect(() => {
    function onDown(e) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target)) setSearchFocused(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (gridRafRef.current) {
        cancelAnimationFrame(gridRafRef.current);
        gridRafRef.current = null;
      }
    };
  }, []);

  const handleGridScroll = useCallback(() => {
    if (gridRafRef.current) return;
    gridRafRef.current = requestAnimationFrame(() => {
      setScrollTop(gridScrollRef.current?.scrollTop ?? 0);
      gridRafRef.current = null;
    });
  }, []);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--popover)' }}>
      {/* Main content (search + grid + footer) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          ref={searchBoxRef}
          className="flex-shrink-0 relative flex items-center"
          style={{ padding: '8px 14px', borderBottom: '1px solid rgba(160,140,110,0.18)', gap: 9 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="flex-1 bg-transparent outline-none"
            placeholder="Search photos, cameras, captions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            style={{
              border: 'none',
              fontSize: 12.5,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              padding: 0,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="flex-shrink-0 transition-colors"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#2c2416'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Clear"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}

          {searchFocused && suggestions.length > 0 && (
            <div
              className="absolute z-30 rounded-md overflow-hidden"
              style={{
                top: 'calc(100% + 4px)',
                left: 14,
                right: 14,
                background: 'var(--popover)',
                boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
                padding: '4px 0',
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSearch(s); setSearchFocused(false); }}
                  className="w-full text-left transition-colors truncate"
                  style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(160,140,110,0.10)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scroll-quiet" style={{ padding: '10px 12px' }}>
          {loading ? (
            <div className="text-center py-12" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12" style={{ fontSize: 11, color: 'var(--text-muted)' }}>No photos found</div>
          ) : (
            <div style={{ columnCount: 3, columnGap: 6 }}>
              {filtered.map((asset) => {
                const key = asset.assetId || asset.publicUrl;
                const isSelected = selected.includes(key);
                return (
                  <PickerTile
                    key={key}
                    asset={asset}
                    isSelected={isSelected}
                    onToggle={() => toggle(asset)}
                    onPreview={() => onPreview && onPreview(asset)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {isMulti && (
          <div
            className="flex-shrink-0 flex items-center justify-between"
            style={{ padding: '10px 14px', borderTop: '1px solid rgba(160,140,110,0.18)' }}
          >
            <span style={{ fontSize: 11, fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} photos`}
            </span>
            <button
              onClick={() => {
                const selectedAssets = filtered.filter((asset) => selected.includes(asset.assetId || asset.publicUrl));
                onConfirm(
                  selectedAssets.map((asset) => normalizeImageRef({ assetId: asset.assetId, url: asset.publicUrl })).filter(Boolean)
                );
              }}
              disabled={selected.length === 0}
              style={{
                background: selected.length === 0 ? 'rgba(60,40,15,0.20)' : '#2c2416',
                color: '#f5ecd6',
                fontSize: 12,
                fontWeight: 500,
                padding: '6px 14px',
                borderRadius: 4,
                cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Add {selected.length > 0 ? selected.length : ""} photo{selected.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Right-edge filter rail */}
      <PickerFilterRail
        collapsed={railCollapsed}
        onToggleCollapsed={onToggleRail}
        filters={filters}
        onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        selectedCollection={collection}
        onSelectCollection={setCollection}
        counts={counts}
        collectionCounts={collectionCounts}
        onClearAll={clearAll}
      />
    </div>
  );
}

// ── Collection picker (pills + searchable dropdown, mirrors lightbox pattern) ─
function buildCollectionTree(slugs) {
  const bySlug = {};
  slugs.forEach((slug) => { bySlug[slug] = { slug, children: [] }; });
  const roots = [];
  slugs.forEach((slug) => {
    const parts = slug.split('/');
    if (parts.length === 1) {
      roots.push(bySlug[slug]);
    } else {
      const parentSlug = parts.slice(0, -1).join('/');
      if (bySlug[parentSlug]) bySlug[parentSlug].children.push(bySlug[slug]);
      else roots.push(bySlug[slug]);
    }
  });
  return roots;
}

function leafLabel(slug) {
  return slug.split('/').pop().split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function subtreeMatches(node, q) {
  if (leafLabel(node.slug).toLowerCase().includes(q)) return true;
  return node.children.some((child) => subtreeMatches(child, q));
}

function CollectionTreeRow({ node, depth, selectedSet, onAdd, query }) {
  const q = (query || '').toLowerCase();
  const labelLower = leafLabel(node.slug).toLowerCase();
  const selfMatches = !q || labelLower.includes(q);
  const hasMatchingChild = q && node.children.some((c) => subtreeMatches(c, q));
  const [expanded, setExpanded] = useState(depth < 1);
  const isExpanded = q ? (selfMatches || hasMatchingChild) : expanded;
  if (q && !selfMatches && !hasMatchingChild) return null;

  const isSelected = selectedSet.has(node.slug);
  const INDENT = 14;
  const left = 8 + depth * INDENT;

  return (
    <div style={{ position: 'relative' }}>
      {depth > 0 && (
        <div style={{ position: 'absolute', left: left - INDENT + 7, top: 0, bottom: 0, width: 1, background: 'rgba(160,140,110,0.22)', pointerEvents: 'none' }} />
      )}
      <div
        className="flex items-center transition-colors"
        style={{ paddingLeft: left, paddingRight: 10, height: 26 }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(44,36,22,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); if (!q) setExpanded((v) => !v); }}
            style={{ width: 14, flexShrink: 0, color: '#b0a490', fontSize: 9, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }}>
            {depth > 0 && <span style={{ display: 'inline-block', width: 6, height: 1, background: 'rgba(160,140,110,0.30)' }} />}
          </span>
        )}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onAdd(node.slug); }}
          style={{
            flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0,
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
            color: isSelected ? '#b0a490' : (!selfMatches ? '#a8967a' : '#2c2416'),
            cursor: 'pointer',
          }}
        >
          {leafLabel(node.slug)}
          {isSelected && <span style={{ marginLeft: 5, fontSize: 9, color: '#a8967a' }}>✓</span>}
        </button>
      </div>
      {isExpanded && node.children.map((child) => (
        <CollectionTreeRow key={child.slug} node={child} depth={depth + 1} selectedSet={selectedSet} onAdd={onAdd} query={query} />
      ))}
    </div>
  );
}

function CollectionPillsPicker({ existingSlugs, selectedSlugs, onAdd, onRemove, onCreate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const tree = useMemo(() => buildCollectionTree(existingSlugs), [existingSlugs]);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  // Slug to (potentially) create from the query — strip leading/trailing slashes & lowercase
  const createSlug = useMemo(() => {
    const s = query.trim().toLowerCase().replace(/[^a-z0-9/_-]/g, '-').replace(/-+/g, '-').replace(/^\/+|\/+$/g, '');
    return s || null;
  }, [query]);

  const exactExists = createSlug && existingSlugs.includes(createSlug);
  const alreadySelected = createSlug && selectedSet.has(createSlug);
  const showCreate = createSlug && !exactExists && !alreadySelected;
  const hasAnyMatch = useMemo(() => {
    if (!query.trim()) return tree.length > 0;
    const q = query.toLowerCase();
    return tree.some((n) => subtreeMatches(n, q));
  }, [tree, query]);

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleAdd = (slug) => {
    onAdd(slug);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleCreate = () => {
    if (!createSlug) return;
    onCreate(createSlug);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {selectedSlugs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 14px' }}>
          {selectedSlugs.map((slug) => {
            const parts = slug.split('/').map(leafLabel).slice(-2);
            const isNew = !existingSlugs.includes(slug);
            return (
              <span
                key={slug}
                title={slug}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.03em',
                  padding: '2px 6px 2px 8px', borderRadius: 3,
                  background: isNew ? 'rgba(139,111,71,0.16)' : 'rgba(139,111,71,0.10)',
                  border: `1px solid ${isNew ? 'rgba(139,111,71,0.40)' : 'rgba(139,111,71,0.22)'}`,
                }}
              >
                <span>
                  {parts.map((p, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ color: '#b0a490', margin: '0 2px' }}>/</span>}
                      <span style={{ color: i === parts.length - 1 ? '#2c2416' : '#a8967a' }}>{p}</span>
                    </span>
                  ))}
                  {isNew && <span style={{ marginLeft: 4, color: '#8b6f47', fontSize: 8.5 }}>NEW</span>}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(slug)}
                  style={{ color: '#a8967a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1, fontSize: 13 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#5c4f3a')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#a8967a')}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div style={{ position: 'relative', padding: '0 14px' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Add or create collection…"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            else if (e.key === 'Enter' && showCreate) { e.preventDefault(); handleCreate(); }
          }}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
            color: '#2c2416',
            background: '#ede8df',
            border: '1px solid rgba(160,140,110,0.30)',
            borderRadius: 4,
            padding: '5px 10px',
            outline: 'none',
          }}
        />
        {open && (
          <div
            style={{
              position: 'absolute', zIndex: 30, bottom: 'calc(100% + 4px)', left: 14, right: 14,
              background: 'var(--popover)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 -16px 32px -8px rgba(26,18,10,0.16)',
              borderRadius: 6,
              maxHeight: 200, overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {tree.length > 0 ? tree.map((node) => (
              <CollectionTreeRow
                key={node.slug}
                node={node}
                depth={0}
                selectedSet={selectedSet}
                onAdd={handleAdd}
                query={query}
              />
            )) : (
              !showCreate && (
                <div style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 10.5, color: 'var(--text-muted)' }}>
                  No collections yet
                </div>
              )
            )}
            {query.trim() && !hasAnyMatch && !showCreate && (
              <div style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 10.5, color: 'var(--text-muted)' }}>
                No collections match
              </div>
            )}
            {showCreate && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                className="w-full text-left transition-colors"
                style={{
                  padding: '7px 12px',
                  fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderTop: tree.length > 0 ? '1px solid rgba(160,140,110,0.18)' : 'none',
                  color: '#2c2416',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(160,140,110,0.10)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#8b6f47', fontWeight: 600 }}>+</span>
                <span>Create</span>
                <span style={{ color: '#8b6f47' }}>{createSlug}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload tab ──────────────────────────────────────────────────────────────
function UploadTab({ onUploaded, libraryConfig }) {
  const [files, setFiles] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]); // ordered list of slugs
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const existingSlugs = useMemo(
    () => Object.keys(libraryConfig?.galleries || {}).sort(),
    [libraryConfig]
  );

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const addCollection = (slug) => {
    setSelectedCollections((prev) => prev.includes(slug) ? prev : [...prev, slug]);
  };
  const removeCollection = (slug) => {
    setSelectedCollections((prev) => prev.filter((s) => s !== slug));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const collections = selectedCollections;
    const folder = collections[0] ? `photos/${collections[0]}` : undefined;
    const uploadedUrls = [];
    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "pending" }));
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder, collections }),
        });
        const { signedUrl, gcsUrl } = await res.json();
        const formData = new FormData();
        Object.entries(signedUrl.fields).forEach(([k, v]) => formData.append(k, v));
        formData.append("file", file);
        const uploadRes = await fetch(signedUrl.url, { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        setProgress((p) => ({ ...p, [file.name]: "done" }));
        uploadedUrls.push(gcsUrl);
      } catch {
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }
    setUploading(false);
    if (uploadedUrls.length > 0) {
      onUploaded(uploadedUrls.map((url) => normalizeImageRef(url)).filter(Boolean));
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--popover)' }}>
      {/* Drop zone — fills available space when no files */}
      <div className="flex-1 flex flex-col min-h-0" style={{ padding: '14px 14px 0' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
          style={{
            border: `1.5px dashed ${dragging ? 'rgba(120,90,60,0.65)' : 'rgba(160,140,110,0.32)'}`,
            background: dragging ? 'rgba(160,140,110,0.10)' : 'rgba(255,253,248,0.45)',
            borderRadius: 6,
            flex: files.length === 0 ? 1 : 'none',
            minHeight: files.length === 0 ? 0 : 110,
            padding: files.length === 0 ? '32px 16px' : '20px 16px',
            transition: 'all 0.18s ease',
          }}
        >
          <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <div
            className="rounded-full flex items-center justify-center mb-2"
            style={{ width: 40, height: 40, background: 'rgba(160,140,110,0.18)', color: '#8b6f47' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Drop photos here</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>or click to browse</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="overflow-y-auto scroll-quiet space-y-1" style={{ marginTop: 10, paddingBottom: 4 }}>
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 group"
                style={{ padding: '4px 8px', borderRadius: 3, background: 'rgba(160,140,110,0.08)' }}
              >
                <span className="flex-1 truncate" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.name}</span>
                <span
                  style={{
                    fontSize: 10.5, fontFamily: MONO, fontWeight: 500,
                    color: progress[f.name] === "done" ? '#3b8a52'
                         : progress[f.name] === "error" ? '#c14a4a'
                         : progress[f.name] === "pending" ? 'var(--text-secondary)'
                         : 'var(--text-muted)',
                  }}
                >
                  {progress[f.name] === "done" ? "✓" : progress[f.name] === "error" ? "✗" : progress[f.name] === "pending" ? "…" : "·"}
                </span>
                {!progress[f.name] && (
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c14a4a')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collections picker — pills + searchable dropdown with create-new */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(160,140,110,0.18)', marginTop: 12, paddingTop: 10, paddingBottom: 10 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: MONO,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 500,
            padding: '0 14px',
            marginBottom: 6,
          }}
        >
          Add to collections
          {selectedCollections.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>
              {selectedCollections.length}
            </span>
          )}
        </div>
        <CollectionPillsPicker
          existingSlugs={existingSlugs}
          selectedSlugs={selectedCollections}
          onAdd={addCollection}
          onRemove={removeCollection}
          onCreate={addCollection}
        />
      </div>

      {/* Action footer */}
      <div className="flex-shrink-0" style={{ padding: '10px 14px', borderTop: '1px solid rgba(160,140,110,0.18)' }}>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full"
          style={{
            background: files.length === 0 || uploading ? 'rgba(60,40,15,0.20)' : '#2c2416',
            color: '#f5ecd6',
            fontSize: 12,
            fontWeight: 500,
            padding: '8px 14px',
            borderRadius: 4,
            cursor: files.length === 0 || uploading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            border: 'none',
          }}
        >
          {uploading ? "Uploading…" : `Upload ${files.length || ''} photo${files.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────
export default function PhotoPickerModal({ images, loading, blockType, onConfirm, onClose, libraryConfig }) {
  const [tab, setTab] = useState("library");
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [previewAsset, setPreviewAsset] = useState(null);
  const panelRef = useRef(null);
  const dragState = useRef(null);
  // Default position: right of platform sidebar (~280) + block sidebar (~260) so the
  // picker opens beside the block being edited, not over it.
  const [pos, setPos] = useState({ x: 560, y: 80 });

  // ESC closes preview
  useEffect(() => {
    if (!previewAsset) return;
    function onKey(e) { if (e.key === 'Escape') setPreviewAsset(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewAsset]);

  const totalWidth = PICKER_BASE_W + (railCollapsed ? RAIL_COLLAPSED_W : RAIL_EXPANDED_W);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      setPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e) => {
    if (e.target.closest("button,input,select,textarea,img")) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: totalWidth,
        height: 600,
        background: 'var(--popover)',
        boxShadow: 'var(--popover-shadow)',
        transition: 'width 0.18s ease',
      }}
    >
      <div
        className="flex items-center px-3.5 cursor-grab select-none flex-shrink-0"
        onMouseDown={startDrag}
        style={{
          height: 40,
          borderBottom: '1px solid rgba(160,140,110,0.22)',
          background: 'var(--popover)',
        }}
      >
        <div className="flex items-center" style={{ height: '100%', marginLeft: -4 }}>
          {['library', 'upload'].map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative transition-colors flex items-center"
                style={{
                  padding: '0 10px',
                  fontSize: 11,
                  fontFamily: MONO,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: active ? '#2c2416' : 'var(--text-muted)',
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {t}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 8, right: 8, bottom: -1,
                      height: 1.5,
                      background: '#2c2416',
                      borderRadius: 1,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto">
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === "library" ? (
          <LibraryTab
            images={images}
            loading={loading}
            blockType={blockType}
            onConfirm={onConfirm}
            libraryConfig={libraryConfig}
            railCollapsed={railCollapsed}
            onToggleRail={setRailCollapsed}
            onPreview={setPreviewAsset}
          />
        ) : (
          <UploadTab onUploaded={onConfirm} libraryConfig={libraryConfig} />
        )}
      </div>

      {previewAsset && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(20,12,4,0.82)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 100 }}
          onClick={() => setPreviewAsset(null)}
        >
          <div className="relative" style={{ maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSizedUrl(previewAsset.publicUrl, 'display')}
              alt={previewAsset.caption || ''}
              style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', display: 'block', boxShadow: '0 12px 48px rgba(0,0,0,0.45)' }}
            />
            {previewAsset.caption && (
              <div
                className="absolute left-0 right-0 bottom-0 px-3 py-2 truncate"
                style={{
                  background: 'linear-gradient(to top, rgba(20,12,4,0.78) 0%, rgba(20,12,4,0) 100%)',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 14,
                  fontStyle: 'italic',
                  color: '#fdf8ec',
                }}
              >
                {previewAsset.caption}
              </div>
            )}
            <button
              onClick={() => setPreviewAsset(null)}
              aria-label="Close preview"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#f5ecd6', color: '#2c2416', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.30)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
