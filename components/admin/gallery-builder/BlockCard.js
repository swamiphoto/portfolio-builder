import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useSession } from "next-auth/react";
import { getSizedUrl } from "../../../common/imageUtils";
import { EditorPhotoBadge } from './EditorFeedbackContext';
import { normalizeImageRefs, buildMultiImageFields, getNestedGalleries, pageDisplayThumbnail, pageThumbGradient, applyFocalPointToPage } from "../../../common/assetRefs";
import { resolveCaption, isCaptionOverridden } from '../../../common/captionResolver';
import { useDrag } from '../../../common/dragContext';
import DesignPopover from "./DesignPopover";
import AdminPhotoLightbox from "../AdminPhotoLightbox";
import PageGalleryPickerModal from "./PageGalleryPickerModal";
import FocalPointEditor from "./FocalPointEditor";
import ImageFocalEditor from "./ImageFocalEditor";
import { resolveVariant } from "../../../common/themes/variants";
import { getBlockSpec } from "../../../common/themes";
import Tip from "../Tip";
import { EditableInput, EditableTextarea } from "../platform/EditableText";
import TextBlockField from "./TextBlockField";

const TYPE_LABELS = {
  page: "Hero",
  photo: "Photo",
  photos: "Photos",
  stacked: "Photos",
  masonry: "Photos",
  text: "Text",
  video: "Video",
  "page-gallery": "Page links",
  contact: "Contact",
  testimonial: "Testimonial",
};

const INPUT = "w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug text-[#2c2416]";

// Thin wrapper over the shared EditableTextarea so block textareas hold their
// value in local state while focused — typing is instant and never dropped by a
// slow parent re-render / autosave round-trip. Keeps the same auto-grow API.
function AutoGrowTextarea({ maxHeight, style: styleProp, ...props }) {
  return (
    <EditableTextarea
      {...props}
      maxHeight={maxHeight}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', ...styleProp }}
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

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
    </svg>
  )
}

function RepositionIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12M2 8h12M8 2L6 4M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
    </svg>
  )
}

function MarkdownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  )
}

function PlainTextIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h10M8 3v10" />
    </svg>
  )
}

// The "…" action menu that lives on an image thumbnail. Items are passed in so a
// photo thumb can offer just Remove while a croppable one also offers Reposition.
// Each item's onClick receives the trigger element, so Reposition can anchor its
// popover to the button. The dropdown flips up when it would fall off-screen.
function ThumbMenu({ items, tone = 'dark', size = 20 }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown, true); window.removeEventListener('keydown', onKey) }
  }, [open])

  function toggle(e) {
    e.stopPropagation(); e.preventDefault()
    if (open) { setOpen(false); return }
    const rect = btnRef.current.getBoundingClientRect()
    const menuH = items.length * 34 + 8
    const belowSpace = window.innerHeight - rect.bottom - 8
    const aboveSpace = rect.top - 8
    const openUp = belowSpace < menuH && aboveSpace > belowSpace
    setPos({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    })
    setOpen(true)
  }

  const dark = tone === 'dark'
  // Inline background beats a Tailwind :hover, so drive the hover state by hand.
  const baseBg = dark
    ? (open ? 'rgba(0,0,0,0.74)' : 'rgba(0,0,0,0.5)')
    : (open ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.9)')
  const hoverBg = dark ? 'rgba(0,0,0,0.74)' : 'rgba(0,0,0,0.08)'
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={toggle}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
        onMouseLeave={(e) => { e.currentTarget.style.background = baseBg }}
        title="Options"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', padding: 0,
          width: size, height: Math.round(size * 0.8),
          borderRadius: 3,
          background: baseBg,
          color: dark ? '#fff' : '#3a362f',
          boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.15)',
          transition: 'background 120ms',
        }}
      >
        <svg width="11" height="3" viewBox="0 0 11 3" fill="currentColor">
          <circle cx="1.5" cy="1.5" r="1" /><circle cx="5.5" cy="1.5" r="1" /><circle cx="9.5" cy="1.5" r="1" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-md overflow-hidden whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
          style={{
            ...(pos.right !== undefined ? { right: pos.right } : {}),
            ...(pos.top !== undefined ? { top: pos.top } : {}),
            ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
            minWidth: 150,
            background: 'var(--popover)',
            boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
            padding: '4px 0',
          }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(btnRef.current) }}
              className="w-full text-left flex items-center gap-2 transition-colors"
              style={{ padding: '7px 12px', fontSize: 12.5, color: it.danger ? '#c14a4a' : 'var(--text-secondary)', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? 'rgba(193,74,74,0.08)' : 'rgba(160,140,110,0.10)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function PhotoThumb({ imageRef, dragHandleProps, onRemove, onReposition, onPreview, selected, isDragging }) {
  const caption = imageRef.caption || ''
  const menuItems = [
    ...(onReposition ? [{ label: 'Reposition', icon: <RepositionIcon />, onClick: (el) => onReposition(el) }] : []),
    { label: 'Remove', danger: true, icon: <TrashIcon />, onClick: () => onRemove() },
  ]

  return (
    <div
      {...dragHandleProps}
      className={`relative group/thumb aspect-square overflow-hidden cursor-grab ${selected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
      style={{
        background: 'var(--card)',
        borderRadius: 2,
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.1s ease',
      }}
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
      <div className="absolute top-0.5 right-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10">
        <ThumbMenu
          size={22}
          items={menuItems}
        />
      </div>
      <EditorPhotoBadge url={imageRef.url} />
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
  onUpdatePage,
  getAssetByUrl,
  allSets,
  setsByUrl,
  onToggleSet,
  sourcePageId,
  blockIndex,
  onRemoveImagesFromBlock,
  onMoveImagesAcrossBlocks,
  assetsByUrl,
  onUpdateLibraryCaption,
  onPrintChange,
  highlighted,
  expandedOverride,
  onTitleClick,
  glowing,
  onMoveUp,
  onMoveDown,
  onAddBlockAbove,
  onAddBlockBelow,
  themeId = 'kyoto',
  onOpenMarkdownEditor,
  defaultGround,
}) {
  const isPhotoBlock = block.type === "photos" || block.type === "stacked" || block.type === "masonry";
  const dragPhotoIndex = useRef(null);
  const draggedUrlRef = useRef(null);
  const [liveRefs, _setLiveRefs] = useState(null);
  const liveRefsRef = useRef(null);
  const setLiveRefs = useCallback((val) => {
    const next = typeof val === 'function' ? val(liveRefsRef.current) : val;
    liveRefsRef.current = next;
    _setLiveRefs(next);
  }, []);
  const blockKeyRef = useRef(Math.random().toString(36).slice(2));
  const { startDrag, endDrag } = useDrag()
  const hasDesign = block.type === "photo" || block.type === "photos" || block.type === "stacked" || block.type === "masonry" || block.type === "text" || block.type === "video" || block.type === "contact" || block.type === "testimonial" || block.type === "page-gallery";

  const { data: session } = useSession();
  const ownerFirstName = session?.user?.name?.split(' ')[0] || 'you';
  const [expanded, setExpanded] = useState(true);
  useEffect(() => { if (expandedOverride != null) setExpanded(expandedOverride.value) }, [expandedOverride]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [showDesign, setShowDesign] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [photoDropHover, setPhotoDropHover] = useState(false);
  const [photoAspect, setPhotoAspect] = useState(null); // natural w/h of the single-photo thumbnail
  const [gridDropHover, setGridDropHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchorRect, setPickerAnchorRect] = useState(null);
  const [pgDragIdx, setPgDragIdx] = useState(null);
  const [pgDropTarget, setPgDropTarget] = useState(null); // { idx, pos: 'before'|'after' }
  const [pgHoverIdx, setPgHoverIdx] = useState(null)
  const [focalEditor, setFocalEditor] = useState(null) // { pageId, anchorEl }
  const [imageFocal, setImageFocal] = useState(null) // { index, anchorEl } | null
  const lastSelectedRef = useRef(null);
  const cardRef = useRef(null);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const designBtnRef = useRef(null);

  function openPicker() { setPickerAnchorRect(cardRef.current?.getBoundingClientRect() ?? null); setPickerOpen(true) }

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

  useEffect(() => {
    if (block.type !== 'page-gallery' || block.source !== 'auto' || !block.parentPageId) return
    const matching = getNestedGalleries(block.parentPageId, pages)
    const newIds = matching.map(p => p.id)
    const oldIds = block.pageIds || []
    const same = newIds.length === oldIds.length && newIds.every((id, i) => id === oldIds[i])
    if (!same) onUpdate({ ...block, pageIds: newIds })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.type, block.source, block.parentPageId, pages]);

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

  // The muted label on the right of the header shows the block's chosen design —
  // its layout/variant for most blocks, the font for text, the hero height for
  // the cover. Resolver-driven so it stays correct as variants/labels evolve.
  const headerMeta = (() => {
    // Hero cover: the height lives on the page, not the block.
    if (block.type === 'page') {
      const pg = (pages || []).find((p) => p.id === sourcePageId);
      return (pg?.cover?.height === 'full') ? 'Full' : 'Partial';
    }
    const spec = getBlockSpec(themeId, block.type);
    if (!spec) {
      // Legacy standalone masonry/stacked block types carry no spec.
      if (block.type === 'masonry') return 'Masonry';
      if (block.type === 'stacked') return 'Stacked';
      return null;
    }
    // Text: the font style is the meaningful choice.
    if (block.type === 'text' && spec.fonts) {
      const fontId = block.font || spec.defaultFont;
      return spec.fonts.find((f) => f.id === fontId)?.label || null;
    }
    // Manhattan: testimonial surfaces its quote style; single photo + video have
    // no layout choice, so no (misleading) variant label.
    if (themeId === 'manhattan') {
      if (block.type === 'testimonial') return block.quoteStyle === 'regular' ? 'Regular' : 'Italic';
      if (block.type === 'video' || block.type === 'photo') return null;
    }
    // Contact has a single 'Standard' variant — nothing worth surfacing.
    if (block.type === 'contact') return null;
    // Everything else: the current layout/variant label.
    const variantId = resolveVariant(block, themeId);
    return (spec.variants || []).find((v) => v.id === variantId)?.label || null;
  })();

  return (
    <div
      ref={cardRef}
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
                  {block.type === "photo" && block.imageUrl ? (
                    // Replace (swap arrows) — a plus would imply adding another photo.
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  )}
                </button>
              </Tip>
            )}

            {block.type === 'page-gallery' && (
              <Tip label="Edit pages">
                <button
                  onClick={() => { onTitleClick?.(); openPicker() }}
                  className="flex items-center justify-center rounded transition-colors"
                  style={{ width: 24, height: 24, color: pickerOpen ? '#1d1b17' : '#9e9788', background: pickerOpen ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!pickerOpen) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                  onMouseLeave={e => { if (!pickerOpen) e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </Tip>
            )}

            {hasDesign && (
              <div className="relative">
                <Tip label="Design">
                  <button
                    ref={designBtnRef}
                    data-tour="block-design"
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
                    themeId={themeId}
                    defaultGround={defaultGround}
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
                      // Flip the menu upward when there isn't room below — otherwise
                      // its lower items fall off the bottom of the screen.
                      const MENU_H = 210;
                      const belowSpace = window.innerHeight - rect.bottom - 8;
                      const aboveSpace = rect.top - 8;
                      const openUp = belowSpace < MENU_H && aboveSpace > belowSpace;
                      setMenuPos({
                        right: window.innerWidth - rect.right,
                        ...(openUp
                          ? { bottom: window.innerHeight - rect.top + 4 }
                          : { top: rect.bottom + 4 }),
                      });
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
                    ...(menuPos.top !== undefined ? { top: menuPos.top } : {}),
                    ...(menuPos.bottom !== undefined ? { bottom: menuPos.bottom } : {}),
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
                  {block.type === 'text' && (
                    <>
                      <div style={{ height: 1, background: 'rgba(160,140,110,0.15)', margin: '4px 0' }} />
                      {block.format !== 'markdown' && (
                        <button
                          onClick={() => { setShowMenu(false); onOpenMarkdownEditor?.(); }}
                          className="w-full text-left flex items-center gap-2 transition-colors"
                          style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <MarkdownIcon />
                          Open markdown editor
                        </button>
                      )}
                      {block.format === 'markdown' && (
                        <button
                          onClick={() => { setShowMenu(false); onUpdate({ ...block, format: undefined }); }}
                          className="w-full text-left flex items-center gap-2 transition-colors"
                          style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <PlainTextIcon />
                          Convert to plain text
                        </button>
                      )}
                    </>
                  )}
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
                    // Clear the normalized `image` object so the new imageUrl wins —
                    // the renderer reads `block.image || block.imageUrl`, so a stale
                    // `image` would otherwise shadow the replacement.
                    const updatedTarget = { ...block, imageUrl: url, image: null };
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
                    className={`relative group/img cursor-grab transition-opacity aspect-video flex items-center justify-center ${photoDropHover ? 'opacity-40' : ''}`}
                    style={{
                      borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,18,10,0.10)',
                      // Keep the block a landscape box; a portrait shot sits inside it fully
                      // visible (centered, sides empty) instead of being cropped to fill.
                      ...(photoAspect !== null && photoAspect < 1 ? { background: '#ece4d2' } : {}),
                    }}
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
                      key={block.imageUrl}
                      src={getSizedUrl(block.imageUrl, 'thumbnail')}
                      alt=""
                      onLoad={(e) => setPhotoAspect(e.target.naturalWidth / e.target.naturalHeight)}
                      className={photoAspect !== null && photoAspect < 1
                        ? "h-full w-auto object-contain pointer-events-none"
                        : "w-full h-full object-cover pointer-events-none"}
                      onError={(e) => { if (e.target.src !== block.imageUrl) e.target.src = block.imageUrl; }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-100 pointer-events-none" />
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                      <ThumbMenu
                        size={22}
                        items={[{ label: 'Remove', danger: true, icon: <TrashIcon />, onClick: () => onUpdate({ ...block, imageUrl: "", image: null }) }]}
                      />
                    </div>
                    <EditorPhotoBadge url={block.imageUrl} />
                  </div>
                ) : (
                  <div
                    onClick={onAddPhotos}
                    className={`flex flex-col items-center justify-center h-20 cursor-pointer transition-colors gap-0.5 ${photoDropHover ? 'bg-blue-50' : ''}`}
                    style={photoDropHover ? { border: '1px solid #93c5fd', borderRadius: 2 } : { background: '#ece4d2', borderRadius: 2 }}
                    onMouseEnter={e => { if (!photoDropHover) e.currentTarget.style.background = '#e3d8bf' }}
                    onMouseLeave={e => { if (!photoDropHover) e.currentTarget.style.background = '#ece4d2' }}
                  >
                    <span className={`text-xs ${photoDropHover ? 'text-blue-600' : ''}`} style={photoDropHover ? {} : { color: 'rgba(58,54,47,0.55)' }}>{photoDropHover ? 'Drop photo here' : 'Drag a photo here'}</span>
                    {!photoDropHover && <span className="text-xs" style={{ color: 'rgba(58,54,47,0.45)' }}>or <span className="underline underline-offset-2 transition-colors text-[#3a362f]/70 hover:text-[#3a362f]">select from library</span></span>}
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
                  className={`grid grid-cols-3 transition-all ${gridDropHover && liveRefs === null ? 'opacity-60' : ''}`}
                  style={{ gap: 1, background: '#e8dfcd', borderRadius: 2, overflow: 'hidden' }}
                >
                  {(() => {
                    const thumbRefs = (liveRefs ?? blockImageRefs).map(r => ({
                      ...r,
                      caption: resolveCaption(r, assetsByUrl || {}),
                    }));
                    const isSquare = block.type === 'photos' && resolveVariant(block, themeId) === 'square';
                    const remainder = thumbRefs.length % 3;
                    const placeholderCount = remainder === 0 ? 0 : 3 - remainder;
                    return (
                      <>
                        {thumbRefs.map((ref, i) => (
                          <PhotoThumb
                            key={ref.url}
                            imageRef={ref}
                            selected={selectedIndices.has(i)}
                            isDragging={liveRefs !== null && ref.url === draggedUrlRef.current}
                            onPreview={(e) => {
                              handleThumbClick(e, i);
                              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) setLightboxIndex(i);
                            }}
                            dragHandleProps={{
                              draggable: true,
                              onDragStart: (e) => {
                                const initialRefs = normalizeImageRefs(block.images || block.imageUrls || []);
                                dragPhotoIndex.current = i;
                                draggedUrlRef.current = ref.url;
                                setLiveRefs(initialRefs);
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
                                e.dataTransfer.setData('text/plain', ref.url);
                                if (sourcePageId) {
                                  startDrag({ type: 'images', imageRefs: dragging, sourceBlockType: block.type, sourcePageId, sourceBlockIndex: blockIndex })
                                }
                              },
                              onDragOver: (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!draggedUrlRef.current) return;
                                setLiveRefs(prev => {
                                  if (!prev) return prev;
                                  const from = prev.findIndex(r => r.url === draggedUrlRef.current);
                                  if (from === i || from === -1) return prev;
                                  const next = [...prev];
                                  const [moved] = next.splice(from, 1);
                                  next.splice(i, 0, moved);
                                  return next;
                                });
                              },
                              onDrop: (e) => {
                                e.preventDefault(); e.stopPropagation();
                                setGridDropHover(false);
                                const raw = e.dataTransfer.getData('application/x-photo-drag');
                                let withinBlock = false;
                                if (raw) {
                                  try { withinBlock = JSON.parse(raw).sourceBlockKey === blockKeyRef.current; } catch {}
                                }
                                // A drop landing on an existing thumbnail from ANOTHER block or the
                                // library is an ADD, not a reorder. stopPropagation above keeps the
                                // card's onDrop from firing, so delegate to it explicitly — otherwise
                                // the photo is silently swallowed.
                                if (!withinBlock) {
                                  setLiveRefs(null); draggedUrlRef.current = null; dragPhotoIndex.current = null;
                                  handleDrop(e);
                                  return;
                                }
                                const finalRefs = liveRefsRef.current;
                                if (finalRefs) onUpdate({ ...block, ...buildMultiImageFields(finalRefs) });
                                setLiveRefs(null);
                                draggedUrlRef.current = null;
                                dragPhotoIndex.current = null;
                              },
                              onDragEnd: () => {
                                dragPhotoIndex.current = null;
                                draggedUrlRef.current = null;
                                setLiveRefs(null);
                                setGridDropHover(false);
                                endDrag();
                                setSelectedIndices(new Set());
                              },
                            }}
                            onRemove={() => onRemovePhoto(ref)}
                            onReposition={isSquare ? (el) => setImageFocal({ index: i, anchorEl: el }) : undefined}
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
              {imageFocal != null && (() => {
                const refs = normalizeImageRefs(block.images || block.imageUrls || [])
                if (!refs[imageFocal.index]) return null
                return (
                  <ImageFocalEditor
                    imageUrl={refs[imageFocal.index].url}
                    focalPoint={refs[imageFocal.index].focalPoint}
                    anchorEl={imageFocal.anchorEl}
                    onClose={() => setImageFocal(null)}
                    onChange={(fp) => {
                      const next = refs.map((img, idx) => idx === imageFocal.index ? { ...img, focalPoint: fp } : img)
                      onUpdate({ ...block, images: next, imageUrls: next.map(r => r.url) })
                    }}
                  />
                )
              })()}
            </>
          )}

          {/* Text */}
          {block.type === "text" && (
            <TextBlockField
              block={block}
              onUpdate={onUpdate}
              onOpenMarkdownEditor={() => onOpenMarkdownEditor?.()}
              AutoGrowTextarea={AutoGrowTextarea}
              inputClass={`${INPUT} resize-none scroll-thin !pt-0`}
            />
          )}

          {/* Video */}
          {block.type === "video" && (
            <>
              <EditableInput
                className={INPUT}
                placeholder="YouTube URL"
                value={block.url || ""}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              />
              <EditableInput
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {block.type === "contact" && (
            <div className="space-y-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Heading</div>
                <EditableInput
                  className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
                  placeholder="Get in touch"
                  value={block.heading || ""}
                  onChange={e => onUpdate({ ...block, heading: e.target.value })}
                />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Subheading</div>
                <AutoGrowTextarea
                  className="border-b border-[rgba(160,140,110,0.3)] pt-1.5 pb-1 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full resize-none"
                  placeholder="I'd love to hear from you…"
                  maxHeight={80}
                  value={block.subheading || ""}
                  onChange={e => onUpdate({ ...block, subheading: e.target.value })}
                />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Button text</div>
                <EditableInput
                  className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
                  placeholder="Send message"
                  value={block.buttonText || ""}
                  onChange={e => onUpdate({ ...block, buttonText: e.target.value })}
                />
              </div>
            </div>
          )}

          {block.type === "testimonial" && (() => {
            const photoUrl = block.imageUrl || block.image?.url || block.image || ''
            return (
              <div className="space-y-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Photo</div>
                  <div
                    onClick={onAddPhotos}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      let url = null
                      const raw = e.dataTransfer.getData('application/x-photo-drag')
                      if (raw) { try { url = JSON.parse(raw).imageRefs?.[0]?.url ?? null } catch {} }
                      if (!url) url = e.dataTransfer.getData('text/plain')
                      if (url) onUpdate({ ...block, imageUrl: url })
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '3px 0' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 3, flexShrink: 0, overflow: photoUrl ? 'hidden' : undefined, background: photoUrl ? undefined : '#ece4d2', boxShadow: 'inset 0 0 0 1px rgba(26,18,10,0.07)' }}>
                      {photoUrl && <img src={getSizedUrl(photoUrl, 'thumbnail')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(58,54,47,0.45)' }}>
                      {photoUrl
                        ? <span className="transition-colors text-[#3a362f]/70 hover:text-[#3a362f]">Replace photo</span>
                        : <span className="underline underline-offset-2 transition-colors text-[#3a362f]/70 hover:text-[#3a362f]">Select from library</span>
                      }
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Name</div>
                  <EditableInput className={INPUT} placeholder="Jane Smith" value={block.name || ''} onChange={e => onUpdate({ ...block, name: e.target.value })} />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Testimonial</div>
                  <AutoGrowTextarea className={`${INPUT} resize-none scroll-thin`} placeholder={`Working with ${ownerFirstName} was an absolute pleasure…`} maxHeight={120} value={block.text || ''} onChange={e => onUpdate({ ...block, text: e.target.value })} />
                </div>
              </div>
            )
          })()}

          {/* Page Gallery */}
          {block.type === "page-gallery" && (() => {
            const source = block.source || 'manual'
            const pgSelected = (block.pageIds || []).map(id => (pages || []).find(p => p.id === id)).filter(Boolean)
            const pgParent = (pages || []).find(p => p.id === block.parentPageId)
            const pgMatching = getNestedGalleries(block.parentPageId, pages)

            function pgHandleDragOver(e, idx) {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = (e.clientY - rect.top) / rect.height < 0.5 ? 'before' : 'after'
              setPgDropTarget(prev => (prev?.idx === idx && prev?.pos === pos) ? prev : { idx, pos })
            }

            function pgHandleDrop(e, idx) {
              e.preventDefault()
              const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
              if (isNaN(sourceIdx)) { setPgDragIdx(null); setPgDropTarget(null); return }
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = (e.clientY - rect.top) / rect.height < 0.5 ? 'before' : 'after'
              let insertAt = pos === 'before' ? idx : idx + 1
              if (sourceIdx < insertAt) insertAt -= 1
              if (insertAt !== sourceIdx) {
                const newIds = [...block.pageIds]
                const [moved] = newIds.splice(sourceIdx, 1)
                newIds.splice(insertAt, 0, moved)
                onUpdate({ ...block, pageIds: newIds })
              }
              setPgDragIdx(null)
              setPgDropTarget(null)
            }

            const editPagesBtn = (
              <button
                type="button"
                onClick={() => openPicker()}
                onMouseEnter={e => { e.currentTarget.style.color = '#3a362f' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9e9788' }}
                style={{
                  marginTop: source === 'manual' && pgSelected.length > 0 ? 6 : 0,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase',
                  color: '#9e9788', fontWeight: 500,
                  transition: 'color 120ms',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Edit Pages
              </button>
            )

            const ghostRows = (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '4px 6px',
                    borderBottom: i < 2 ? '1px solid rgba(26,18,10,0.07)' : 'none',
                  }}>
                    <div style={{ width: 26, height: 26, borderRadius: 3, flexShrink: 0, background: '#ede7dc', boxShadow: 'inset 0 0 0 1px rgba(26,18,10,0.07)' }} />
                    <div style={{ flex: 1, height: 8, borderRadius: 2, background: '#ede7dc', opacity: 0.7 - i * 0.18, maxWidth: `${85 - i * 18}%` }} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openPicker()}
                  onMouseEnter={e => { e.currentTarget.style.color = '#3a362f' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9e9788' }}
                  style={{
                    marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: '#9e9788', fontWeight: 500, transition: 'color 120ms',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  Pick pages
                </button>
              </div>
            )

            const manualRows = (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
                {pgSelected.map((p, idx) => {
                  const thumb = pageDisplayThumbnail(p)
                  const isBefore = pgDropTarget?.idx === idx && pgDropTarget.pos === 'before'
                  const isAfter = pgDropTarget?.idx === idx && pgDropTarget.pos === 'after'
                  const isDragging = pgDragIdx === idx
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', String(idx)); e.dataTransfer.effectAllowed = 'move'; setPgDragIdx(idx) }}
                      onDragEnd={() => { setPgDragIdx(null); setPgDropTarget(null) }}
                      onDragOver={e => pgHandleDragOver(e, idx)}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPgDropTarget(null) }}
                      onDrop={e => pgHandleDrop(e, idx)}
                      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = 'rgba(26,18,10,0.04)'; setPgHoverIdx(idx) }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; setPgHoverIdx(prev => prev === idx ? null : prev) }}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'transparent',
                        cursor: 'grab',
                        opacity: isDragging ? 0.35 : 1,
                        userSelect: 'none',
                        transition: 'background 120ms',
                      }}
                    >
                      {isBefore && <div aria-hidden style={{ position: 'absolute', left: 4, right: 4, top: -1, height: 2, background: '#8b6f47', borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />}
                      {isAfter && <div aria-hidden style={{ position: 'absolute', left: 4, right: 4, bottom: -1, height: 2, background: '#8b6f47', borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />}
                      <div style={{
                        position: 'relative',
                        width: 36, height: 36, borderRadius: 3, flexShrink: 0,
                        background: thumb ? undefined : pageThumbGradient(p.id),
                        boxShadow: 'inset 0 0 0 1px rgba(26,18,10,0.07)',
                        overflow: 'hidden',
                      }}>
                        {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />}
                        <div
                          onMouseDown={e => e.stopPropagation()}
                          style={{ position: 'absolute', top: 2, right: 2, opacity: pgHoverIdx === idx ? 1 : 0, transition: 'opacity 120ms' }}
                        >
                          <ThumbMenu
                            size={18}
                            items={[
                              // Page-gallery thumbnails are always cropped to a fixed frame, so
                              // reposition is relevant here (unlike edge-to-edge photo blocks).
                              ...(thumb ? [{ label: 'Reposition', icon: <RepositionIcon />, onClick: (el) => setFocalEditor({ pageId: p.id, anchorEl: el }) }] : []),
                              { label: 'Remove', danger: true, icon: <TrashIcon />, onClick: () => onUpdate({ ...block, pageIds: (block.pageIds || []).filter(id => id !== p.id) }) },
                            ]}
                          />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: '#1d1b17', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        {p.description && <div style={{ fontSize: 11, color: '#9e9788', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{p.description}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )

            const autoFilled = (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(139,111,71,0.06)', marginBottom: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b6f47" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" />
                  </svg>
                  <div style={{ fontSize: 12, color: '#3a362f', minWidth: 0 }}>
                    Auto-listing <strong>{pgMatching.length}</strong> {pgMatching.length === 1 ? 'page' : 'pages'} under <strong>{pgParent?.title || '?'}</strong>
                  </div>
                </div>
                {editPagesBtn}
              </div>
            )

            return (
              <>
                {source === 'auto' && block.parentPageId ? autoFilled : pgSelected.length === 0 ? ghostRows : manualRows}
                {pickerOpen && (
                  <PageGalleryPickerModal
                    block={block}
                    pages={pages}
                    currentPageId={sourcePageId}
                    onUpdate={onUpdate}
                    onClose={() => setPickerOpen(false)}
                    anchorRect={pickerAnchorRect}
                  />
                )}
                {focalEditor && (() => {
                  const fpPage = (pages || []).find(p => p.id === focalEditor.pageId)
                  if (!fpPage) return null
                  return (
                    <FocalPointEditor
                      page={fpPage}
                      anchorEl={focalEditor.anchorEl}
                      onClose={() => setFocalEditor(null)}
                      onChange={(fp) => onUpdatePage && onUpdatePage(fpPage.id, applyFocalPointToPage(fpPage, fp))}
                    />
                  )
                })()}
              </>
            )
          })()}
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
            print: asset.print,
            forSale: asset.forSale,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            sets: setsByUrl?.[ref.url] || [],
          } : { ...ref, caption: effectiveCaption, sets: setsByUrl?.[ref.url] || [] };
        });
        // Write a caption as a per-block override on the ref (reliable — persists via
        // config autosave, shows immediately regardless of library state).
        const writeRefCaption = (i, newCaption) => {
          if (isPhotoBlock) {
            const refs = normalizeImageRefs(block.images || block.imageUrls || []);
            const updated = refs.map((r, j) => j === i ? { ...r, caption: newCaption } : r);
            onUpdate({ ...block, ...buildMultiImageFields(updated) });
          } else {
            onUpdate({ ...block, caption: newCaption });
          }
        };
        return (
          <AdminPhotoLightbox
            images={enriched}
            allSets={allSets}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            onPrintChange={onPrintChange}
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
            onCaptionChange={(i, newCaption) => writeRefCaption(i, newCaption)}
            onCaptionChangeToLibrary={(i, newCaption) => {
              const img = enriched[i];
              if (img?.assetId && onUpdateLibraryCaption) {
                // Pass the url so the library cache entry carries a publicUrl and the
                // block re-renders (resolveCaption is keyed by url).
                onUpdateLibraryCaption(img.assetId, newCaption, img.url);
              } else {
                // No library asset to write to → keep it as a per-photo override so
                // the caption isn't silently lost.
                writeRefCaption(i, newCaption);
              }
            }}
            onToggleSet={(slug, type, add) => {
              const img = enriched[lightboxIndex];
              if (img && onToggleSet) onToggleSet(img.url, slug, type, add);
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
  prev.defaultGround === next.defaultGround &&
  prev.themeId === next.themeId &&
  prev.assetsByUrl === next.assetsByUrl &&
  // Sets data loads async (library fetch resolves after first paint). Without
  // these, the card never re-renders when allSets/setsByUrl arrive, so the
  // lightbox's set picker stays empty. Both are useMemo'd on libraryData, so
  // this only re-renders when sets actually change.
  prev.allSets === next.allSets &&
  prev.setsByUrl === next.setsByUrl
);
