import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from "react";
import { getSizedUrl } from "../../../common/imageUtils";
import { normalizeImageRefs, buildMultiImageFields } from "../../../common/assetRefs";
import { resolveCaption, isCaptionOverridden } from '../../../common/captionResolver';
import { useDrag } from '../../../common/dragContext';
import DesignPopover from "./DesignPopover";
import AdminPhotoLightbox from "../AdminPhotoLightbox";
import Tip from "../Tip";

const TYPE_LABELS = {
  page: "Hero",
  photo: "Photo",
  photos: "Photos",
  stacked: "Photos",
  masonry: "Photos",
  text: "Text",
  video: "Video",
  "page-gallery": "Page Gallery",
};

const INPUT = "w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug text-[#2c2416]";

function AutoGrowTextarea({ className, value, onChange, placeholder, maxHeight, style: styleProp, ...props }) {
  const ref = useRef(null);
  const adjust = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.height = '0';
    const sh = ref.current.scrollHeight;
    ref.current.style.height = Math.min(sh, maxHeight || sh) + 'px';
    ref.current.style.overflowY = maxHeight && sh > maxHeight ? 'auto' : 'hidden';
  }, [maxHeight]);
  useLayoutEffect(() => { adjust(); }, [value, adjust]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', ...styleProp }}
      {...props}
    />
  );
}

function PaintbrushIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

function PhotoThumb({ imageRef, dragHandleProps, onRemove, onPreview, selected }) {
  const caption = imageRef.caption || ''

  return (
    <div
      {...dragHandleProps}
      className={`relative group/thumb aspect-square overflow-hidden cursor-grab ${selected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
      style={{ background: 'var(--card)', borderRadius: 2 }}
      onClick={onPreview}
    >
      <img
        src={getSizedUrl(imageRef.url, 'thumbnail')}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => { if (e.target.src !== imageRef.url) e.target.src = imageRef.url; }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors duration-100 pointer-events-none" />
      {selected && (
        <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full z-10 leading-none pointer-events-none">
          ✓
        </div>
      )}
      {caption && (
        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1.5 py-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-tight pointer-events-none">
          {caption}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0.5 right-0.5 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none z-10"
      >
        ×
      </button>
    </div>
  )
}

function BlockCard({
  block,
  dragHandleProps,
  onUpdate,
  onRemove,
  onAddPhotos,
  onRemovePhoto,
  pages,
  getAssetByUrl,
  allCollections,
  collectionsByUrl,
  onToggleCollection,
  sourcePageId,
  blockIndex,
  onRemoveImagesFromBlock,
  onMoveImagesAcrossBlocks,
  assetsByUrl,
  onUpdateLibraryCaption,
  highlighted,
  expandedOverride,
  onTitleClick,
  glowing,
  onMoveUp,
  onMoveDown,
  onAddBlockAbove,
  onAddBlockBelow,
}) {
  const isPhotoBlock = block.type === "photos" || block.type === "stacked" || block.type === "masonry";
  const dragPhotoIndex = useRef(null);
  const blockKeyRef = useRef(Math.random().toString(36).slice(2));
  const { startDrag, endDrag } = useDrag()
  const hasDesign = block.type === "photo" || block.type === "photos" || block.type === "stacked" || block.type === "masonry" || block.type === "text" || block.type === "video";

  const [expanded, setExpanded] = useState(true);
  useEffect(() => { if (expandedOverride != null) setExpanded(expandedOverride.value) }, [expandedOverride]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [showDesign, setShowDesign] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [photoDropHover, setPhotoDropHover] = useState(false);
  const [gridDropHover, setGridDropHover] = useState(false);
  const lastSelectedRef = useRef(null);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const designBtnRef = useRef(null);

  const handleThumbClick = (e, i) => {
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation();
      setSelectedIndices(prev => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        lastSelectedRef.current = i;
        return next;
      });
    } else if (e.shiftKey && lastSelectedRef.current !== null) {
      e.stopPropagation();
      const min = Math.min(lastSelectedRef.current, i);
      const max = Math.max(lastSelectedRef.current, i);
      setSelectedIndices(new Set(Array.from({ length: max - min + 1 }, (_, k) => min + k)));
    } else {
      lastSelectedRef.current = i;
      setSelectedIndices(new Set());
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target)
      ) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSelectedIndices(new Set());
        lastSelectedRef.current = null;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setGridDropHover(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setGridDropHover(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setGridDropHover(false);
    if (!isPhotoBlock) return;
    const raw = e.dataTransfer.getData('application/x-photo-drag');
    let incomingRefs;
    let sourceBlockIndexFromDrop = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.sourceBlockKey === blockKeyRef.current) return; // within-block, handled by thumb
        incomingRefs = Array.isArray(parsed.imageRefs) && parsed.imageRefs.length ? parsed.imageRefs : null;
        sourceBlockIndexFromDrop = parsed.sourceBlockIndex ?? null;
      } catch { incomingRefs = null; }
    }
    if (!incomingRefs) {
      const url = e.dataTransfer.getData('text/plain');
      if (!url) return;
      incomingRefs = [{ assetId: null, url }];
    }
    const existingRefs = normalizeImageRefs(block.images || block.imageUrls || []);
    const toAdd = incomingRefs.filter(r => !existingRefs.some(ex => ex.url === r.url));
    if (!toAdd.length) return;
    const updatedTarget = { ...block, ...buildMultiImageFields([...existingRefs, ...toAdd]) };
    if (sourceBlockIndexFromDrop !== null && onMoveImagesAcrossBlocks) {
      onMoveImagesAcrossBlocks(sourceBlockIndexFromDrop, incomingRefs, blockIndex, updatedTarget);
    } else {
      onUpdate(updatedTarget);
    }
  };

  const blockImageRefs = isPhotoBlock
    ? normalizeImageRefs(block.images || block.imageUrls || [])
    : [];

  const singlePhotoImages = block.type === "photo" && (block.imageUrl || block.image)
    ? [{ url: block.imageUrl || block.image?.url || '', ...(block.caption !== undefined ? { caption: block.caption } : {}) }]
    : [];

  const headerMeta = (() => {
    if (isPhotoBlock) {
      const layout = block.type === 'masonry' ? 'masonry'
        : block.type === 'stacked' ? 'stacked'
        : (block.layout || '').toLowerCase();
      if (layout === 'masonry') return 'Masonry';
      if (layout === 'stacked') return 'Stacked';
      return null;
    }
    if (block.type === 'photo') {
      const layout = block.layout;
      if (!layout || layout === 'Full Bleed' || layout === 'Edge to edge') return 'Full Bleed';
      return 'Centered';
    }
    if (block.type === 'text') return null;
    if (block.type === 'video') return 'Video';
    if (block.type === 'page-gallery') {
      const n = (block.pageIds || []).length;
      return n > 0 ? `${n} page${n === 1 ? '' : 's'}` : null;
    }
    return null;
  })();

  return (
    <div
      className="group/card relative overflow-hidden block-card-spec"
      style={{
        background: '#f6f3ec',
        borderRadius: 5,
        boxShadow: '0 1px 2px rgba(26,18,10,0.05), 0 0 0 1px rgba(26,18,10,0.06)',
        transition: 'box-shadow 150ms',
      }}
      onDragEnter={isPhotoBlock ? (e) => { e.preventDefault(); setGridDropHover(true); } : undefined}
      onDragOver={isPhotoBlock ? handleDragOver : undefined}
      onDragLeave={isPhotoBlock ? handleDragLeave : undefined}
      onDrop={isPhotoBlock ? handleDrop : undefined}
    >
      {glowing && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: 'blockGlow 3.5s linear forwards', zIndex: 10, borderRadius: 5 }}
        />
      )}

      {/* Card header */}
      <div className="flex items-center" style={{ gap: 8, padding: '8px 10px 7px' }}>
        {block.type === 'page' ? (
          <span className="flex-shrink-0" style={{ color: '#9e9788', display: 'flex', alignItems: 'center', width: 13 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="14" rx="1.5"/>
              <circle cx="8.5" cy="9.5" r="1.4"/>
              <path d="M3 16l5-4 4 3 4-3 5 4"/>
            </svg>
          </span>
        ) : (
          <span
            {...dragHandleProps}
            className="cursor-grab select-none flex-shrink-0 transition-colors group-hover/card:text-[#9e9788]"
            style={{ color: '#b0a490', display: 'flex', alignItems: 'center', width: 7 }}
          >
            <svg width="7" height="11" viewBox="0 0 7 11" fill="currentColor">
              <circle cx="2" cy="2" r="1"/><circle cx="5" cy="2" r="1"/>
              <circle cx="2" cy="5.5" r="1"/><circle cx="5" cy="5.5" r="1"/>
              <circle cx="2" cy="9" r="1"/><circle cx="5" cy="9" r="1"/>
            </svg>
          </span>
        )}

        <button
          className="flex-1 text-left transition-colors"
          style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: 9.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 500,
            color: '#3a362f',
            cursor: onTitleClick ? 'pointer' : 'default',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
          onClick={onTitleClick || undefined}
        >
          {TYPE_LABELS[block.type] || block.type}
        </button>

        {/* Right side: metadata (default) ↔ toolbar pill (hover) */}
        <div className="relative flex items-center" style={{ minHeight: 22 }}>
          {/* Toolbar pill: always in DOM to reserve space; cross-fades in on card hover */}
          <div
            className={`flex items-center transition-opacity duration-150 ${showDesign || showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto'}`}
            style={{
              background: showDesign || showMenu ? 'rgba(232,225,212,0.9)' : 'rgba(232,225,212,0.9)',
              borderRadius: 4,
              padding: '1px 2px',
              gap: 1,
            }}
          >
            {(block.type === "photo" || isPhotoBlock) && (
              <Tip label={
                block.type === "photo"
                  ? (block.imageUrl ? "Replace photo" : "Add a photo")
                  : (blockImageRefs.length > 0 ? "Add more photos" : "Add photos")
              }>
                <button
                  onClick={() => { onTitleClick?.(); onAddPhotos(); }}
                  className="flex items-center justify-center rounded transition-colors"
                  style={{ width: 24, height: 24, color: '#9e9788', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
              </Tip>
            )}

            {hasDesign && (
              <div className="relative">
                <Tip label="Design">
                  <button
                    ref={designBtnRef}
                    onClick={() => { onTitleClick?.(); setShowDesign((v) => !v); }}
                    className="flex items-center justify-center rounded transition-colors flex-shrink-0"
                    style={{ width: 24, height: 24, color: showDesign ? '#1d1b17' : '#9e9788', background: showDesign ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => { if (!showDesign) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                    onMouseLeave={e => { if (!showDesign) e.currentTarget.style.background = 'transparent' }}
                  >
                    <PaintbrushIcon />
                  </button>
                </Tip>
                {showDesign && (
                  <DesignPopover
                    block={block}
                    onUpdate={onUpdate}
                    onClose={() => setShowDesign(false)}
                    anchorEl={designBtnRef.current}
                  />
                )}
              </div>
            )}

            <div ref={menuRef}>
              <button
                ref={menuBtnRef}
                onClick={() => {
                  setShowMenu((v) => {
                    if (!v && menuBtnRef.current) {
                      const rect = menuBtnRef.current.getBoundingClientRect();
                      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    }
                    return !v;
                  });
                }}
                className="flex items-center justify-center rounded transition-colors"
                style={{ width: 24, height: 24, color: showMenu ? '#1d1b17' : '#9e9788', background: showMenu ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { if (!showMenu) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                onMouseLeave={e => { if (!showMenu) e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="11" height="3" viewBox="0 0 11 3" fill="currentColor">
                  <circle cx="1.5" cy="1.5" r="1"/>
                  <circle cx="5.5" cy="1.5" r="1"/>
                  <circle cx="9.5" cy="1.5" r="1"/>
                </svg>
              </button>
              {showMenu && menuPos && (
                <div
                  ref={menuRef}
                  className="fixed z-[9999] rounded-md overflow-hidden whitespace-nowrap"
                  style={{
                    top: menuPos.top,
                    right: menuPos.right,
                    minWidth: 152,
                    background: 'var(--popover)',
                    boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
                    padding: '4px 0',
                  }}
                >
                  <button
                    onClick={() => { setShowMenu(false); onAddBlockAbove?.(menuBtnRef.current.getBoundingClientRect()); }}
                    disabled={!onAddBlockAbove}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, opacity: onAddBlockAbove ? 1 : 0.35, cursor: onAddBlockAbove ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => { if (onAddBlockAbove) e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v6M5 6l3-3 3 3"/><path d="M2 11h12" strokeOpacity="0.5"/>
                    </svg>
                    Add block above
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onAddBlockBelow?.(menuBtnRef.current.getBoundingClientRect()); }}
                    disabled={!onAddBlockBelow}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, opacity: onAddBlockBelow ? 1 : 0.35, cursor: onAddBlockBelow ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => { if (onAddBlockBelow) e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 13V7M5 10l3 3 3-3"/><path d="M2 5h12" strokeOpacity="0.5"/>
                    </svg>
                    Add block below
                  </button>
                  <div style={{ height: 1, background: 'rgba(160,140,110,0.15)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setShowMenu(false); onMoveUp(); }}
                    disabled={!onMoveUp}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, opacity: onMoveUp ? 1 : 0.35, cursor: onMoveUp ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => { if (onMoveUp) e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M3 8l5-5 5 5"/></svg>
                    Move up
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onMoveDown(); }}
                    disabled={!onMoveDown}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, opacity: onMoveDown ? 1 : 0.35, cursor: onMoveDown ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => { if (onMoveDown) e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10M3 8l5 5 5-5"/></svg>
                    Move down
                  </button>
                  <div style={{ height: 1, background: 'rgba(160,140,110,0.15)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setShowMenu(false); onRemove(); }}
                    className="w-full text-left flex items-center gap-2 transition-colors"
                    style={{ padding: '7px 12px', fontSize: 12.5, color: '#c14a4a', fontWeight: 500 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(193,74,74,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"/></svg>
                    Remove block
                  </button>
                </div>
              )}
            </div>

            <Tip label={expanded ? "Collapse" : "Expand"}>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center justify-center rounded transition-colors flex-shrink-0"
                style={{ width: 24, height: 24, color: '#9e9788', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {expanded ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10l4-4 4 4"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6l4 4 4-4"/>
                  </svg>
                )}
              </button>
            </Tip>
          </div>

          {/* Metadata: absolute overlay that fades out on card hover */}
          {headerMeta && (
            <div className={`absolute inset-0 flex items-center justify-end transition-opacity duration-150 pointer-events-none ${showDesign || showMenu ? 'opacity-0' : 'opacity-100 group-hover/card:opacity-0'}`} style={{ paddingRight: 4 }}>
              <span
                className="truncate"
                style={{
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#b0a490',
                  whiteSpace: 'nowrap',
                }}
              >
                {headerMeta}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '4px 12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Single photo */}
          {block.type === "photo" && (
            <>
              <div
                onDragEnter={(e) => { e.preventDefault(); setPhotoDropHover(true); }}
                onDragOver={(e) => { e.preventDefault(); setPhotoDropHover(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPhotoDropHover(false); }}
                onDrop={(e) => {
                  setPhotoDropHover(false);
                  e.preventDefault();
                  const raw = e.dataTransfer.getData('application/x-photo-drag');
                  let url = null;
                  let srcIdx = null;
                  let srcRefs = null;
                  if (raw) {
                    try {
                      const parsed = JSON.parse(raw);
                      if (parsed.sourceBlockKey === blockKeyRef.current) return;
                      url = parsed.imageRefs?.[0]?.url ?? null;
                      srcIdx = parsed.sourceBlockIndex ?? null;
                      srcRefs = parsed.imageRefs ?? null;
                    } catch {}
                  }
                  if (!url) url = e.dataTransfer.getData('text/plain');
                  if (url) {
                    const updatedTarget = { ...block, imageUrl: url };
                    if (srcIdx !== null && srcRefs && onMoveImagesAcrossBlocks) {
                      onMoveImagesAcrossBlocks(srcIdx, srcRefs, blockIndex, updatedTarget);
                    } else {
                      onUpdate(updatedTarget);
                    }
                  }
                }}
              >
                {block.imageUrl ? (
                  <div
                    className={`relative group/img cursor-grab transition-opacity ${photoDropHover ? 'opacity-40' : ''}`}
                    style={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,18,10,0.10)' }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      const ref = { url: block.imageUrl, assetId: null };
                      if (block.caption !== undefined) ref.caption = block.caption;
                      const payload = { imageRefs: [ref], sourceBlockType: block.type, sourceBlockKey: blockKeyRef.current, sourceBlockIndex: blockIndex };
                      e.dataTransfer.setData('application/x-photo-drag', JSON.stringify(payload));
                      e.dataTransfer.setData('text/plain', block.imageUrl);
                      if (sourcePageId) startDrag({ type: 'images', imageRefs: [ref], sourceBlockType: block.type, sourcePageId, sourceBlockIndex: blockIndex });
                    }}
                    onDragEnd={() => { endDrag(); }}
                    onClick={() => setLightboxIndex(0)}
                  >
                    <img
                      src={getSizedUrl(block.imageUrl, 'thumbnail')}
                      alt=""
                      className="w-full aspect-video object-cover pointer-events-none"
                      onError={(e) => { if (e.target.src !== block.imageUrl) e.target.src = block.imageUrl; }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-100 pointer-events-none" />
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate({ ...block, imageUrl: "" }); }}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[10px] px-2 py-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      × Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={onAddPhotos}
                    className={`flex flex-col items-center justify-center h-20 cursor-pointer transition-colors gap-0.5 ${photoDropHover ? 'bg-blue-50' : ''}`}
                    style={photoDropHover ? { border: '1px solid #93c5fd', borderRadius: 2 } : { background: '#ece4d2', borderRadius: 2 }}
                  >
                    <span className={`text-xs ${photoDropHover ? 'text-blue-600' : ''}`} style={photoDropHover ? {} : { color: 'rgba(58,54,47,0.55)' }}>{photoDropHover ? 'Drop photo here' : 'Drag a photo here'}</span>
                    {!photoDropHover && <span className="text-xs" style={{ color: 'rgba(58,54,47,0.45)' }}>or <span className="underline underline-offset-2 transition-colors" style={{ color: 'rgba(58,54,47,0.7)' }}>select from library</span></span>}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Photos block (stacked or masonry) */}
          {isPhotoBlock && (
            <>
              {blockImageRefs.length === 0 ? (
                <div
                  onClick={onAddPhotos}
                  className={`grid grid-cols-3 cursor-pointer transition-opacity ${gridDropHover ? 'opacity-60' : ''}`}
                  style={{ gap: 1, background: '#e8dfcd', borderRadius: 2, overflow: 'hidden' }}
                >
                  {(() => {
                    const SEPIA_PLACEHOLDERS = ['#9a8466', '#a08a68', '#8a7252', '#c4a987', '#7a6244', '#5a4a36', '#a08a68', '#9a8466', '#c4a987']
                    return SEPIA_PLACEHOLDERS.map((c, i) => (
                      <div
                        key={i}
                        className="aspect-square transition-opacity"
                        style={{ background: c, opacity: 0.85 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.85' }}
                      />
                    ))
                  })()}
                </div>
              ) : (
                <div
                  className={`grid grid-cols-3 transition-all ${gridDropHover ? 'opacity-60' : ''}`}
                  style={{ gap: 1, background: '#e8dfcd', borderRadius: 2, overflow: 'hidden' }}
                >
                  {(() => {
                    const thumbRefs = blockImageRefs.map(r => ({
                      ...r,
                      caption: resolveCaption(r, assetsByUrl || {}),
                    }));
                    const remainder = thumbRefs.length % 3;
                    const placeholderCount = remainder === 0 ? 0 : 3 - remainder;
                    return (
                      <>
                        {thumbRefs.map((ref, i) => (
                          <PhotoThumb
                            key={ref.url}
                            imageRef={ref}
                            selected={selectedIndices.has(i)}
                            onPreview={(e) => {
                              handleThumbClick(e, i);
                              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) setLightboxIndex(i);
                            }}
                            dragHandleProps={{
                              draggable: true,
                              onDragStart: (e) => {
                                dragPhotoIndex.current = i;
                                e.dataTransfer.effectAllowed = 'move';
                                e.stopPropagation();
                                const dragging = selectedIndices.size > 1 && selectedIndices.has(i)
                                  ? blockImageRefs.filter((_, j) => selectedIndices.has(j))
                                  : [blockImageRefs[i]];
                                const payload = {
                                  imageRefs: dragging,
                                  sourceBlockType: block.type,
                                  sourceBlockKey: blockKeyRef.current,
                                  sourceBlockIndex: blockIndex,
                                };
                                e.dataTransfer.setData('application/x-photo-drag', JSON.stringify(payload));
                                e.dataTransfer.setData('text/plain', blockImageRefs[i].url);
                                if (sourcePageId) {
                                  startDrag({ type: 'images', imageRefs: dragging, sourceBlockType: block.type, sourcePageId, sourceBlockIndex: blockIndex })
                                }
                              },
                              onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
                              onDrop: (e) => {
                                e.preventDefault(); e.stopPropagation();
                                const raw = e.dataTransfer.getData('application/x-photo-drag');
                                if (raw) {
                                  try {
                                    const parsed = JSON.parse(raw);
                                    if (parsed.sourceBlockKey !== blockKeyRef.current) return;
                                  } catch { return; }
                                }
                                const from = dragPhotoIndex.current;
                                if (from === null || from === i) return;
                                const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                                const [moved] = refs.splice(from, 1);
                                refs.splice(i, 0, moved);
                                dragPhotoIndex.current = null;
                                onUpdate({ ...block, ...buildMultiImageFields(refs) });
                              },
                              onDragEnd: () => {
                                dragPhotoIndex.current = null
                                endDrag()
                                setSelectedIndices(new Set())
                              },
                            }}
                            onRemove={() => onRemovePhoto(blockImageRefs[i])}
                          />
                        ))}
                        {Array.from({ length: placeholderCount }).map((_, i) => {
                          const SEPIA_PLACEHOLDERS = ['#9a8466', '#a08a68', '#8a7252', '#c4a987', '#7a6244', '#5a4a36']
                          const baseColor = SEPIA_PLACEHOLDERS[(thumbRefs.length + i) % SEPIA_PLACEHOLDERS.length]
                          return (
                            <div
                              key={`ph-${i}`}
                              className="aspect-square cursor-pointer transition-opacity"
                              style={{ background: baseColor, opacity: 0.85 }}
                              onClick={() => { onTitleClick?.(); onAddPhotos(); }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85' }}
                            />
                          )
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* Text */}
          {block.type === "text" && (
            <AutoGrowTextarea
              className={`${INPUT} resize-none scroll-thin`}
              placeholder="Write something…"
              maxHeight={160}
              value={block.content || ""}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
            />
          )}

          {/* Video */}
          {block.type === "video" && (
            <>
              <input
                className={INPUT}
                placeholder="YouTube URL"
                value={block.url || ""}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {/* Page Gallery */}
          {block.type === "page-gallery" && (
            <div className="space-y-1.5">
              {(!pages || pages.length === 0) ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No other pages yet.</p>
              ) : (
                pages.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(block.pageIds || []).includes(p.id)}
                      onChange={e => {
                        const pageIds = e.target.checked
                          ? [...(block.pageIds || []), p.id]
                          : (block.pageIds || []).filter(id => id !== p.id)
                        onUpdate({ ...block, pageIds })
                      }}
                      className="w-3 h-3 flex-shrink-0"
                    />
                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin inspector lightbox for block image previews */}
      {lightboxIndex !== null && (() => {
        const baseImages = isPhotoBlock ? blockImageRefs : singlePhotoImages;
        const enriched = baseImages.map(ref => {
          const asset = getAssetByUrl ? getAssetByUrl(ref.url) : null;
          const effectiveCaption = resolveCaption(ref, assetsByUrl || {});
          return asset ? {
            url: asset.publicUrl,
            caption: effectiveCaption,
            originalFilename: asset.originalFilename,
            bytes: asset.bytes,
            width: asset.width,
            height: asset.height,
            source: asset.source,
            capture: asset.capture,
            usage: asset.usage,
            orientation: asset.orientation,
            assetId: asset.assetId,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            collections: collectionsByUrl?.[ref.url] || [],
          } : { ...ref, caption: effectiveCaption, collections: collectionsByUrl?.[ref.url] || [] };
        });
        return (
          <AdminPhotoLightbox
            images={enriched}
            allCollections={allCollections}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            isOverride={(i) => {
              if (isPhotoBlock) {
                const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                return isCaptionOverridden(refs[i]);
              }
              return isCaptionOverridden(block);
            }}
            onToggleOverride={(i, checked) => {
              if (isPhotoBlock) {
                const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                const updated = refs.map((r, j) => {
                  if (j !== i) return r;
                  if (checked) {
                    const asset = assetsByUrl?.[r.url];
                    return { ...r, caption: asset?.caption ?? '' };
                  }
                  const { caption: _cap, ...rest } = r;
                  return rest;
                });
                onUpdate({ ...block, ...buildMultiImageFields(updated) });
              } else {
                if (checked) {
                  const asset = assetsByUrl?.[block.imageUrl];
                  onUpdate({ ...block, caption: asset?.caption ?? '' });
                } else {
                  const { caption: _cap, ...rest } = block;
                  onUpdate(rest);
                }
              }
            }}
            onRevertToLibrary={(i) => {
              if (isPhotoBlock) {
                const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                const updated = refs.map((r, j) => {
                  if (j !== i) return r;
                  const { caption: _cap, ...rest } = r;
                  return rest;
                });
                onUpdate({ ...block, ...buildMultiImageFields(updated) });
              } else {
                const { caption: _cap, ...rest } = block;
                onUpdate(rest);
              }
            }}
            onCaptionChange={(i, newCaption) => {
              // override path: write to block ref
              if (isPhotoBlock) {
                const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                const updated = refs.map((r, j) => j === i ? { ...r, caption: newCaption } : r);
                onUpdate({ ...block, ...buildMultiImageFields(updated) });
              } else {
                onUpdate({ ...block, caption: newCaption });
              }
            }}
            onCaptionChangeToLibrary={(i, newCaption) => {
              const img = enriched[i];
              if (img?.assetId && onUpdateLibraryCaption) {
                onUpdateLibraryCaption(img.assetId, newCaption);
              }
            }}
            onToggleCollection={(slug, type, add) => {
              const img = enriched[lightboxIndex];
              if (img && onToggleCollection) onToggleCollection(img.url, slug, type, add);
            }}
          />
        );
      })()}
    </div>
  );
}

export default memo(BlockCard, (prev, next) =>
  prev.block === next.block &&
  prev.highlighted === next.highlighted &&
  prev.glowing === next.glowing &&
  prev.expandedOverride?.ts === next.expandedOverride?.ts &&
  prev.blockIndex === next.blockIndex &&
  prev.assetsByUrl === next.assetsByUrl
);
