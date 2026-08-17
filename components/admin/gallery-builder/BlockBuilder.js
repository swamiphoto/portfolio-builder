import { useState, useRef, useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, cloneElement, isValidElement } from "react";
import { getSizedUrl } from "../../../common/imageUtils";
import { useDrag } from '../../../common/dragContext';
import Tip from "../Tip";
import { EditableInput, EditableTextarea } from '../platform/EditableText';
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import BlockCard from "./BlockCard";
import BlockTypeMenu, { defaultBlock } from "./BlockTypeMenu";
import MarkdownEditorPanel from "./MarkdownEditorPanel";
import ToggleSwitch from "../common/ToggleSwitch";
import { buildMultiImageFields, removeImageRef, normalizeImageRefs } from "../../../common/assetRefs";
import { useEditorFeedback } from './EditorFeedbackContext';

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

function InsertionZone({ onInsert }) {
  return (
    <div
      className="group/zone relative flex items-center justify-center cursor-pointer"
      style={{ height: 6, marginTop: 0, zIndex: 2 }}
      onClick={onInsert}
    >
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px opacity-0 group-hover/zone:opacity-100 transition-opacity duration-100"
        style={{ background: 'radial-gradient(ellipse 70% 100% at center, rgba(160,140,110,0.6) 0%, transparent 100%)' }}
      />
      <Tip label="Add a block here" side="right">
        <div
          className="insertion-zone-btn absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full opacity-0 group-hover/zone:opacity-100 hover:scale-110 transition-all duration-150"
          style={{
            width: 24,
            height: 24,
            background: 'linear-gradient(155deg, #fefcf8 0%, #ebe5db 100%)',
            border: 'none',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
            <path d="M4.5 1.5v6M1.5 4.5h6" />
          </svg>
        </div>
      </Tip>
    </div>
  );
}

const BlockBuilder = forwardRef(function BlockBuilder({
  gallery,
  onChange,
  onPublish,
  publishing,
  autosaveStatus,
  hasDraft,
  isPublished,
  onAddPhotosToBlock,
  onPickThumbnail,
  expanded,
  onToggleExpand,
  pages,
  onUpdatePage,
  getAssetByUrl,
  allSets,
  setsByUrl,
  onToggleSet,
  headerLabel = 'GALLERY',
  infoLabel = 'Gallery Info',
  namePlaceholder = 'Gallery name',
  pageSettingsSlot,
  infoCardHidden = false,
  onOpenPageSettings,
  onBack,
  sourcePageId,
  onMoveBlockToPage,
  assetsByUrl,
  onUpdateLibraryCaption,
  onPrintChange,
  className,
  onScrollPreviewToBlock,
  highlightedBlockIndex,
  onBlockHover,
  themeId = 'kyoto',
  autoFocusTitle,
  libraryImages = [],
  libraryConfig = {},
  libraryLoading = false,
  onMarkdownEditorOpen = () => {},
  blockGroundDefaults,
}, ref) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [expandedOverride, setExpandedOverride] = useState(null);
  const [allExpanded, setAllExpanded] = useState(true);
  const [glowingBlockIndex, setGlowingBlockIndex] = useState(null);
  const [markdownEditorIndex, setMarkdownEditorIndex] = useState(null);

  const feedbackCtx = useEditorFeedback();

  const blocksContainerRef = useRef(null);

  const { startDrag, endDrag, dropTargetPageId } = useDrag()

  // BlockCard is memoized and its comparator ignores these callback props, so a
  // card can hold a handler closed over a STALE gallery/onChange (e.g. the drop
  // target rendered while a sibling block was still empty, then didn't re-render
  // when photos were added to that sibling). Reading through refs makes every
  // mutation operate on the CURRENT gallery, so a cross-block move can't wipe a
  // block whose images were added after the target last rendered.
  const galleryRef = useRef(gallery); galleryRef.current = gallery;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;

  // Masthead title input — focused + selected when a page is freshly created so
  // the user can rename "Untitled" by just typing. `autoFocusTitle` is a token
  // (timestamp) that changes on each creation.
  const titleInputRef = useRef(null);
  useEffect(() => {
    if (!autoFocusTitle) return;
    // Defer to the next frame so the "Untitled" value is committed to the input
    // before we select it — otherwise the caret lands at the end instead of the
    // text being highlighted.
    const raf = requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, el.value.length);
    });
    return () => cancelAnimationFrame(raf);
  }, [autoFocusTitle]);
  const emit = (next) => onChangeRef.current(next);

  const scrollSidebarToBlock = (index) => {
    const el = blocksContainerRef.current;
    if (!el) return;
    const card = el.querySelector(`[data-block-index="${index}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setGlowingBlockIndex(index);
    setTimeout(() => setGlowingBlockIndex(null), 3500);
  };

  useImperativeHandle(ref, () => ({
    scrollToBlock(index) { scrollSidebarToBlock(index); },
    openAddBlockMenu(index, anchorRect) {
      setMenuAnchorRect(anchorRect);
      setInsertAtIndex(index);
      setShowBlockMenu(true);
    }
  }), []);

  const updateField = (key, value) => emit({ ...galleryRef.current, [key]: value });

  const addBlock = (block) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    const insertIndex = insertAtIndex !== null ? insertAtIndex : blocks.length;
    blocks.splice(insertIndex, 0, block);
    emit({ ...galleryRef.current, blocks });
    setInsertAtIndex(null);
    // Scroll both the block sidebar and the live preview to the new block so its
    // placeholder is visible, wherever it was inserted. The preview scroll waits a
    // beat longer for the (flush-rendered) block to mount.
    setTimeout(() => scrollSidebarToBlock(insertIndex), 60);
    setTimeout(() => onScrollPreviewToBlock?.(insertIndex), 160);
  };

  const updateBlock = (index, updated) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    blocks[index] = updated;
    emit({ ...galleryRef.current, blocks });
  };

  const removeBlock = (index) => {
    const blocks = (galleryRef.current.blocks || []).filter((_, i) => i !== index);
    emit({ ...galleryRef.current, blocks });
  };

  const moveBlock = (index, direction) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    emit({ ...galleryRef.current, blocks });
  };

  const removePhotoFromBlock = (blockIndex, imageRef) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      ...buildMultiImageFields(
        removeImageRef(blocks[blockIndex].images || blocks[blockIndex].imageUrls || [], imageRef)
      ),
    };
    emit({ ...galleryRef.current, blocks });
  };

  const removeImagesFromBlock = (blockIndex, imageRefs) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    const block = blocks[blockIndex];
    if (!block) return;
    const urls = new Set(imageRefs.map(r => r.url));
    if (block.type === 'photo') {
      if (urls.has(block.imageUrl)) blocks[blockIndex] = { ...block, imageUrl: '', image: null };
    } else {
      const remaining = normalizeImageRefs(block.images || block.imageUrls || []).filter(r => !urls.has(r.url));
      blocks[blockIndex] = { ...block, ...buildMultiImageFields(remaining) };
    }
    emit({ ...galleryRef.current, blocks });
  };

  const moveImagesBetweenBlocks = (sourceBlockIndex, imageRefs, targetBlockIndex, updatedTargetBlock) => {
    const blocks = [...(galleryRef.current.blocks || [])];
    blocks[targetBlockIndex] = updatedTargetBlock;
    const src = blocks[sourceBlockIndex];
    if (src) {
      const urls = new Set(imageRefs.map(r => r.url));
      if (src.type === 'photo') {
        if (urls.has(src.imageUrl)) blocks[sourceBlockIndex] = { ...src, imageUrl: '', image: null };
      } else {
        const remaining = normalizeImageRefs(src.images || src.imageUrls || []).filter(r => !urls.has(r.url));
        blocks[sourceBlockIndex] = { ...src, ...buildMultiImageFields(remaining) };
      }
    }
    emit({ ...galleryRef.current, blocks });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const blocks = Array.from(galleryRef.current.blocks || []);
    const [moved] = blocks.splice(result.source.index, 1);
    blocks.splice(result.destination.index, 0, moved);
    emit({ ...galleryRef.current, blocks });
  };

  return (
    <div
      className={className || "w-72 flex-shrink-0 flex flex-col h-full relative z-10 text-left font-sans"}
      style={{ background: '#efeae1' }}
    >

      {/* MASTHEAD — page title + toolbar (mirrors page sidebar masthead) */}
      {onToggleExpand && (
        <div className="flex-shrink-0" style={{ padding: '18px 14px 12px', borderBottom: '1px solid rgba(26,18,10,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 1 }}>
              {/* Client feedback toggle */}
              {feedbackCtx?.hasFeedback && (
                <Tip label={feedbackCtx.showFeedback ? 'Hide client feedback' : 'Show client feedback'} side="bottom">
                  <button
                    onClick={() => feedbackCtx.setShowFeedback(!feedbackCtx.showFeedback)}
                    style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: feedbackCtx.showFeedback ? 'rgba(193,74,74,0.12)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: feedbackCtx.showFeedback ? '#c14a4a' : '#9e9788', transition: 'background 120ms' }}
                    onMouseEnter={e => { if (!feedbackCtx.showFeedback) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                    onMouseLeave={e => { if (!feedbackCtx.showFeedback) e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={feedbackCtx.showFeedback ? '#c14a4a' : 'none'} stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </Tip>
              )}

              {/* Page settings */}
              {onOpenPageSettings && (
                <Tip label="Page settings" side="bottom">
                  <button
                    data-tour="page-settings"
                    onClick={(e) => onOpenPageSettings(e.currentTarget)}
                    style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9e9788', transition: 'background 120ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                  </button>
                </Tip>
              )}

              {/* Add block */}
              <Tip label="Add block" side="bottom">
                <button
                  data-tour="add-block"
                  onClick={(e) => { setMenuAnchorRect(e.currentTarget.getBoundingClientRect()); setInsertAtIndex(null); setShowBlockMenu(true); }}
                  style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9e9788', transition: 'background 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
              </Tip>

              {/* Collapse/expand all */}
              <Tip label={allExpanded ? 'Collapse all blocks' : 'Expand all blocks'} side="bottom">
                <button
                  onClick={() => {
                    const next = !allExpanded
                    setAllExpanded(next)
                    setExpandedOverride({ value: next, ts: Date.now() })
                  }}
                  style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9e9788', transition: 'background 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {allExpanded ? (
                    // Collapse all — double chevron up
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7l4-4 4 4M4 12l4-4 4 4" />
                    </svg>
                  ) : (
                    // Expand all — double chevron down
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4l4 4 4-4M4 9l4 4 4-4" />
                    </svg>
                  )}
                </button>
              </Tip>

              {/* Collapse panel */}
              <Tip label="Collapse panel" side="bottom">
                <button
                  onClick={onToggleExpand}
                  style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9e9788', transition: 'background 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13L5 8l5-5"/>
                  </svg>
                </button>
              </Tip>
            </div>
          </div>

          {/* Hero title — editable, Fraunces 22px. This is the big title shown on
              the page itself; it defaults to (and tracks) the page name until
              edited here, then diverges. The nav name is renamed in the sidebar. */}
          <EditableInput
            ref={titleInputRef}
            value={gallery.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Untitled"
            spellCheck={false}
            className="w-full bg-transparent border-none outline-none p-0 placeholder:text-[#b8ab97]"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22,
              color: '#1d1b17',
              lineHeight: 1.2,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              paddingBottom: 2,
            }}
          />
        </div>
      )}

      {/* All blocks — scrollable */}
      <div ref={blocksContainerRef} className={`flex-1 overflow-y-auto scroll-quiet px-3 pb-3 ${infoCardHidden ? 'pt-1' : 'pt-3'}`}>

        {/* Info card */}
        {pageSettingsSlot ? (isValidElement(pageSettingsSlot) ? cloneElement(pageSettingsSlot, { expandedOverride }) : pageSettingsSlot) : (
          <div className="overflow-hidden mb-1.5" style={{ background: '#f6f3ec', borderRadius: 4, boxShadow: '0 1px 3px rgba(26,18,10,0.07), 0 0 0 1px rgba(26,18,10,0.05)' }}>
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2">
              <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="2" y="4" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 14l5-5a2 2 0 012.8 0l3 3 2.2-2.2a2 2 0 012.8 0L22 13" />
                </svg>
              </span>
              <span className="text-xs font-semibold flex-1 tracking-wide" style={{ color: 'var(--text-secondary)' }}>{infoLabel}</span>
              <button
                onClick={() => setInfoExpanded((v) => !v)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${infoExpanded ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>

            {infoExpanded && (
              <div className="px-3 pb-3 pt-3 space-y-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Name</div>
                  <EditableInput
                    className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
                    placeholder={namePlaceholder}
                    value={gallery.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Slug</div>
                  <EditableInput
                    className="border-b border-[rgba(160,140,110,0.3)] py-1.5 text-xs text-[#2c2416] font-mono outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full"
                    placeholder="slug"
                    value={gallery.slug || ""}
                    onChange={(e) => updateField("slug", e.target.value)}
                  />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Description</div>
                  <EditableTextarea
                    className="border-b border-[rgba(160,140,110,0.3)] pt-1.5 pb-1 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug w-full resize-none"
                    placeholder="A brief description…"
                    maxHeight={120}
                    value={gallery.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>

                {/* Thumbnail row */}
                <div>
                <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Thumbnail</div>
                <div className="flex items-center gap-3">
                  <div
                    onClick={onPickThumbnail}
                    className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors`}
                    style={{ border: '1px solid var(--border)', background: gallery.thumbnailUrl ? undefined : 'var(--card)' }}
                  >
                    {gallery.thumbnailUrl ? (
                      <img src={getSizedUrl(gallery.thumbnailUrl, 'thumbnail')} alt="Cover" className="w-full h-full object-cover" onError={(e) => { if (e.target.src !== gallery.thumbnailUrl) e.target.src = gallery.thumbnailUrl }} />
                    ) : (
                      <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                      </svg>
                    )}
                  </div>
                  <button onClick={onPickThumbnail} className="text-xs text-left transition-colors leading-none" style={{ color: 'var(--text-secondary)' }}>
                    Select from library
                  </button>
                </div>
                </div>

                {/* Unlisted toggle */}
                <div
                  className="flex items-center gap-2 cursor-pointer pt-0.5"
                  onClick={() => updateField("visibility", gallery.visibility === "unlisted" ? "public" : "unlisted")}
                >
                  <ToggleSwitch
                    on={gallery.visibility === "unlisted"}
                    onChange={(v) => updateField("visibility", v ? "unlisted" : "public")}
                    ariaLabel="Unlisted"
                  />
                  <span className="text-xs select-none" style={{ color: 'var(--text-secondary)' }}>Unlisted</span>
                </div>

                {/* Slideshow toggle */}
                <div className="flex items-center justify-between pt-0.5">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => updateField("enableSlideshow", !gallery.enableSlideshow)}
                  >
                    <ToggleSwitch
                      on={!!gallery.enableSlideshow}
                      onChange={(v) => updateField("enableSlideshow", v)}
                      ariaLabel="Include slideshow"
                    />
                    <span className="text-xs select-none" style={{ color: 'var(--text-secondary)' }}>Include slideshow</span>
                  </div>
                  {gallery.enableSlideshow && gallery.slug && (
                    <Link
                      href={`/admin/galleries/${gallery.slug}/slideshow`}
                      className="text-xs underline underline-offset-2 transition-colors" style={{ color: 'var(--text-muted)' }}
                    >
                      Customize →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content blocks */}
        <DragDropContext
          onDragStart={(start) => {
            const block = (gallery.blocks || [])[start.source.index]
            if (block && sourcePageId) {
              startDrag({ type: 'block', block, sourcePageId })
            }
          }}
          onDragEnd={(result) => {
            const targetPageId = dropTargetPageId
            endDrag()
            if (!result.destination) {
              if (targetPageId && targetPageId !== sourcePageId && onMoveBlockToPage) {
                const block = (gallery.blocks || [])[result.source.index]
                if (block) onMoveBlockToPage(sourcePageId, result.source.index, targetPageId)
              }
              return
            }
            handleDragEnd(result)
          }}
        >
          <Droppable droppableId="blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {(gallery.blocks || []).map((block, index) => (
                  <div
                    key={`slot-${index}`}
                    className="rounded-lg"
                    data-block-index={index}
                  >
                    <InsertionZone
                      onInsert={(e) => {
                        setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
                        setInsertAtIndex(index);
                        setShowBlockMenu(true);
                      }}
                    />
                    <Draggable draggableId={`block-${index}`} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <BlockCard
                            block={block}
                            dragHandleProps={provided.dragHandleProps}
                            onUpdate={(updated) => updateBlock(index, updated)}
                            onRemove={() => removeBlock(index)}
                            onMoveUp={index > 0 ? () => { moveBlock(index, -1); onScrollPreviewToBlock?.(index - 1); } : null}
                            onMoveDown={index < (gallery.blocks || []).length - 1 ? () => { moveBlock(index, 1); onScrollPreviewToBlock?.(index + 1); } : null}
                            onAddPhotos={() => onAddPhotosToBlock(index)}
                            onAddBlockAbove={(rect) => { setMenuAnchorRect(rect); setInsertAtIndex(index); setShowBlockMenu(true); }}
                            onAddBlockBelow={(rect) => { setMenuAnchorRect(rect); setInsertAtIndex(index + 1); setShowBlockMenu(true); }}
                            onRemovePhoto={(url) => removePhotoFromBlock(index, url)}
                            pages={pages}
                            onUpdatePage={onUpdatePage}
                            getAssetByUrl={getAssetByUrl}
                            allSets={allSets}
                            setsByUrl={setsByUrl}
                            onToggleSet={onToggleSet}
                            sourcePageId={sourcePageId}
                            blockIndex={index}
                            onRemoveImagesFromBlock={(srcIdx, refs) => removeImagesFromBlock(srcIdx, refs)}
                            onMoveImagesAcrossBlocks={(srcIdx, refs, tgtIdx, updatedTgt) => moveImagesBetweenBlocks(srcIdx, refs, tgtIdx, updatedTgt)}
                            assetsByUrl={assetsByUrl}
                            onUpdateLibraryCaption={onUpdateLibraryCaption}
                            onPrintChange={onPrintChange}
                            highlighted={highlightedBlockIndex === index}
                            expandedOverride={expandedOverride}
                            onTitleClick={onScrollPreviewToBlock ? () => onScrollPreviewToBlock(index) : undefined}
                            glowing={glowingBlockIndex === index}
                            themeId={themeId}
                            onOpenMarkdownEditor={() => { onMarkdownEditorOpen(); setMarkdownEditorIndex(index); }}
                            defaultGround={blockGroundDefaults?.[index]}
                          />
                        </div>
                      )}
                    </Draggable>
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Terminal add block — dashed-border mono caps */}
        <button
          onClick={(e) => {
            setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
            setInsertAtIndex(null);
            setShowBlockMenu(true);
          }}
          className="w-full transition-colors"
          style={{
            marginTop: 6,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'transparent',
            border: '1px dashed rgba(26,18,10,0.14)',
            borderRadius: 5,
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 500,
            color: '#9e9788',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Block
        </button>

      </div>

      {/* Footer: autosave + publish — only when publish action exists */}
      {onPublish && (
        <div className="px-3 py-2 flex-shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="font-mono text-[10px] flex-1" style={{ color: 'var(--text-muted)' }}>
            {autosaveStatus === "saving" && "Saving…"}
            {autosaveStatus === "saved" && "Saved"}
            {autosaveStatus === "unsaved" && "Unsaved"}
          </span>
          <button
            onClick={onPublish}
            disabled={publishing || (isPublished && !hasDraft)}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'var(--sepia-accent)', color: '#fff' }}
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      )}

      {showBlockMenu && (
        <BlockTypeMenu
          onAdd={addBlock}
          anchorRect={menuAnchorRect}
          onClose={() => { setShowBlockMenu(false); setInsertAtIndex(null); }}
        />
      )}

      <MarkdownEditorPanel
        open={markdownEditorIndex != null}
        block={markdownEditorIndex != null ? (galleryRef.current.blocks || [])[markdownEditorIndex] : null}
        onChange={(updated) => updateBlock(markdownEditorIndex, updated)}
        onClose={() => setMarkdownEditorIndex(null)}
        libraryImages={libraryImages}
        libraryConfig={libraryConfig}
        libraryLoading={libraryLoading}
      />
    </div>
  );
})

export default BlockBuilder;
