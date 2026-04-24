import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { getSizedUrl } from "../../../common/imageUtils";
import { useDrag } from '../../../common/dragContext';
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import BlockCard from "./BlockCard";
import BlockTypeMenu, { defaultBlock } from "./BlockTypeMenu";
import { buildMultiImageFields, removeImageRef, normalizeImageRefs } from "../../../common/assetRefs";

function AutoGrowTextarea({ className, value, onChange, placeholder, ...props }) {
  const ref = useRef(null);
  const adjust = useCallback(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, []);
  useEffect(() => { adjust(); }, [value, adjust]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: "hidden", resize: "none" }}
      {...props}
    />
  );
}

function InsertionZone({ onInsert }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center cursor-pointer transition-all duration-150"
      style={{ height: hovered ? 28 : 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onInsert}
    >
      {hovered && (
        <>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px" style={{ background: 'var(--rule-2)' }} />
          <div
            className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--paper)', border: '1px solid var(--rule-2)' }}
          >
            <span className="text-[9px] font-bold leading-none" style={{ color: 'var(--ink-3)' }}>+</span>
          </div>
        </>
      )}
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
  getAssetByUrl,
  allCollections,
  collectionsByUrl,
  onToggleCollection,
  headerLabel = 'GALLERY',
  infoLabel = 'Gallery Info',
  namePlaceholder = 'Gallery name',
  pageSettingsSlot,
  onBack,
  sourcePageId,
  onMoveBlockToPage,
  assetsByUrl,
  onUpdateLibraryCaption,
  className,
  onScrollRatioChange,
  highlightedBlockIndex,
  onBlockHover,
}, ref) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [infoExpanded, setInfoExpanded] = useState(true);

  const blocksContainerRef = useRef(null);
  const isSyncingRef = useRef(false);

  const { startDrag, endDrag, dropTargetPageId } = useDrag()

  // Expose scrollToRatio so parent can drive sidebar scroll from preview
  useImperativeHandle(ref, () => ({
    scrollToRatio(ratio) {
      const el = blocksContainerRef.current;
      if (!el) return;
      isSyncingRef.current = true;
      el.scrollTop = ratio * Math.max(0, el.scrollHeight - el.clientHeight);
      setTimeout(() => { isSyncingRef.current = false; }, 100);
    }
  }), []);

  const handleBlocksScroll = useCallback(() => {
    if (isSyncingRef.current || !onScrollRatioChange || !blocksContainerRef.current) return;
    const el = blocksContainerRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    onScrollRatioChange(el.scrollTop / max);
  }, [onScrollRatioChange]);

  const updateField = (key, value) => onChange({ ...gallery, [key]: value });

  const addBlock = (block) => {
    const blocks = [...(gallery.blocks || [])];
    const isAppend = insertAtIndex === null;
    if (insertAtIndex !== null) {
      blocks.splice(insertAtIndex, 0, block);
    } else {
      blocks.push(block);
    }
    onChange({ ...gallery, blocks });
    setInsertAtIndex(null);
    if (isAppend) {
      setTimeout(() => {
        if (blocksContainerRef.current) {
          blocksContainerRef.current.scrollTop = blocksContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const updateBlock = (index, updated) => {
    const blocks = [...(gallery.blocks || [])];
    blocks[index] = updated;
    onChange({ ...gallery, blocks });
  };

  const removeBlock = (index) => {
    const blocks = (gallery.blocks || []).filter((_, i) => i !== index);
    onChange({ ...gallery, blocks });
  };

  const removePhotoFromBlock = (blockIndex, imageRef) => {
    const blocks = [...(gallery.blocks || [])];
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      ...buildMultiImageFields(
        removeImageRef(blocks[blockIndex].images || blocks[blockIndex].imageUrls || [], imageRef)
      ),
    };
    onChange({ ...gallery, blocks });
  };

  const removeImagesFromBlock = (blockIndex, imageRefs) => {
    const blocks = [...(gallery.blocks || [])];
    const block = blocks[blockIndex];
    if (!block) return;
    const urls = new Set(imageRefs.map(r => r.url));
    if (block.type === 'photo') {
      if (urls.has(block.imageUrl)) blocks[blockIndex] = { ...block, imageUrl: '' };
    } else {
      const remaining = normalizeImageRefs(block.images || block.imageUrls || []).filter(r => !urls.has(r.url));
      blocks[blockIndex] = { ...block, ...buildMultiImageFields(remaining) };
    }
    onChange({ ...gallery, blocks });
  };

  const moveImagesBetweenBlocks = (sourceBlockIndex, imageRefs, targetBlockIndex, updatedTargetBlock) => {
    const blocks = [...(gallery.blocks || [])];
    blocks[targetBlockIndex] = updatedTargetBlock;
    const src = blocks[sourceBlockIndex];
    if (src) {
      const urls = new Set(imageRefs.map(r => r.url));
      if (src.type === 'photo') {
        if (urls.has(src.imageUrl)) blocks[sourceBlockIndex] = { ...src, imageUrl: '' };
      } else {
        const remaining = normalizeImageRefs(src.images || src.imageUrls || []).filter(r => !urls.has(r.url));
        blocks[sourceBlockIndex] = { ...src, ...buildMultiImageFields(remaining) };
      }
    }
    onChange({ ...gallery, blocks });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const blocks = Array.from(gallery.blocks || []);
    const [moved] = blocks.splice(result.source.index, 1);
    blocks.splice(result.destination.index, 0, moved);
    onChange({ ...gallery, blocks });
  };

  const overlineStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  };

  return (
    <div
      className={className || "w-72 flex-shrink-0 flex flex-col h-full relative z-10 text-left font-sans"}
      style={!className ? { background: 'var(--paper)', borderRight: '1px solid var(--rule)' } : undefined}
    >
      {/* Header bar */}
      <div
        className="px-3 pt-3 pb-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <button
          onClick={onBack || onToggleExpand}
          className="transition-colors text-sm leading-none"
          style={{ color: 'var(--ink-4)' }}
        >←</button>
        <span className="flex-1" style={{ ...overlineStyle, color: 'var(--ink-4)' }}>{headerLabel}</span>
        <span style={{ ...overlineStyle, color: 'var(--ink-4)' }}>
          {autosaveStatus === "saving" && "Saving…"}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "unsaved" && "Unsaved"}
        </span>
        {!onBack && (
          <button
            onClick={onToggleExpand}
            className="transition-colors flex-shrink-0"
            style={{ color: 'var(--ink-4)' }}
            title="Collapse sidebar"
          >
            <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        {onPublish && (
          <button
            onClick={onPublish}
            disabled={publishing || (isPublished && !hasDraft)}
            className="px-4 py-1.5 disabled:opacity-40 transition-colors"
            style={{
              ...overlineStyle,
              background: 'var(--ink)',
              color: 'var(--paper)',
            }}
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>

      {/* All blocks — scrollable */}
      <div ref={blocksContainerRef} onScroll={handleBlocksScroll} className="flex-1 overflow-y-auto px-3 py-3">

        {/* Info card */}
        {pageSettingsSlot ? pageSettingsSlot : (
          <div
            className="overflow-hidden mb-1.5"
            style={{ background: 'var(--paper)', border: '1px solid var(--rule)', boxShadow: 'var(--pane-shadow)' }}
          >
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
              style={{ background: 'transparent' }}
              onClick={() => setInfoExpanded((v) => !v)}
            >
              <span className="flex-1" style={{ ...overlineStyle, color: 'var(--ink-3)' }}>{infoLabel}</span>
              <svg className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${infoExpanded ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ink-4)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {infoExpanded && (
              <div className="px-3 pb-3 pt-3 space-y-4" style={{ borderTop: '1px solid var(--rule)' }}>
                <div>
                  <div style={{ ...overlineStyle, color: 'var(--ink-4)' }}>Name</div>
                  <input
                    className="w-full p-0 pb-1 text-sm leading-snug font-medium outline-none transition-colors mt-1"
                    style={{ background: 'transparent', borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}
                    placeholder={namePlaceholder}
                    value={gallery.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ ...overlineStyle, color: 'var(--ink-4)' }}>Slug</div>
                  <input
                    className="w-full p-0 pb-1 text-xs leading-snug font-mono outline-none transition-colors mt-1"
                    style={{ background: 'transparent', borderBottom: '1px solid var(--rule)', color: 'var(--ink-3)' }}
                    placeholder="slug"
                    value={gallery.slug || ""}
                    onChange={(e) => updateField("slug", e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ ...overlineStyle, color: 'var(--ink-4)' }}>Description</div>
                  <AutoGrowTextarea
                    className="w-full p-0 pb-1 text-sm leading-snug outline-none transition-colors mt-1"
                    style={{ background: 'transparent', borderBottom: '1px solid var(--rule)', color: 'var(--ink-3)' }}
                    placeholder="Description"
                    value={gallery.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>

                {/* Thumbnail row */}
                <div>
                <div style={{ ...overlineStyle, color: 'var(--ink-4)' }}>Thumbnail</div>
                <div className="flex items-center gap-3 pt-1.5">
                  <div
                    onClick={onPickThumbnail}
                    className="w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors"
                    style={{ background: gallery.thumbnailUrl ? 'transparent' : 'var(--paper-2)', border: '1px solid var(--rule)' }}
                  >
                    {gallery.thumbnailUrl ? (
                      <img src={getSizedUrl(gallery.thumbnailUrl, 'thumbnail')} alt="Cover" className="w-full h-full object-cover" onError={(e) => { if (e.target.src !== gallery.thumbnailUrl) e.target.src = gallery.thumbnailUrl }} />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--ink-4)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                      </svg>
                    )}
                  </div>
                  <button
                    onClick={onPickThumbnail}
                    className="text-xs text-left transition-colors leading-none"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    Select from library
                  </button>
                </div>
                </div>

                {/* Unlisted toggle */}
                <div
                  className="flex items-center gap-2 cursor-pointer pt-0.5"
                  onClick={() => updateField("visibility", gallery.visibility === "unlisted" ? "public" : "unlisted")}
                >
                  <div
                    className="w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0"
                    style={{ background: gallery.visibility === "unlisted" ? 'var(--ink)' : 'var(--rule-2)' }}
                  >
                    <div
                      className={`absolute top-[2px] w-[10px] h-[10px] rounded-full shadow-sm transition-transform ${gallery.visibility === "unlisted" ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                      style={{ background: 'var(--paper)' }}
                    />
                  </div>
                  <span className="text-xs select-none" style={{ color: 'var(--ink-3)' }}>Unlisted</span>
                </div>

                {/* Slideshow toggle */}
                <div className="flex items-center justify-between pt-0.5">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => updateField("enableSlideshow", !gallery.enableSlideshow)}
                  >
                    <div
                      className="w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0"
                      style={{ background: gallery.enableSlideshow ? 'var(--ink)' : 'var(--rule-2)' }}
                    >
                      <div
                        className={`absolute top-[2px] w-[10px] h-[10px] rounded-full shadow-sm transition-transform ${gallery.enableSlideshow ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                        style={{ background: 'var(--paper)' }}
                      />
                    </div>
                    <span className="text-xs select-none" style={{ color: 'var(--ink-3)' }}>Include slideshow</span>
                  </div>
                  {gallery.enableSlideshow && gallery.slug && (
                    <Link
                      href={`/admin/galleries/${gallery.slug}/slideshow`}
                      className="text-xs underline underline-offset-2 transition-colors"
                      style={{ color: 'var(--ink-4)' }}
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
                    onMouseEnter={() => onBlockHover?.(index)}
                    onMouseLeave={() => onBlockHover?.(null)}
                    className="rounded-lg"
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
                            onAddPhotos={() => onAddPhotosToBlock(index)}
                            onRemovePhoto={(url) => removePhotoFromBlock(index, url)}
                            pages={pages}
                            getAssetByUrl={getAssetByUrl}
                            allCollections={allCollections}
                            collectionsByUrl={collectionsByUrl}
                            onToggleCollection={onToggleCollection}
                            sourcePageId={sourcePageId}
                            blockIndex={index}
                            onRemoveImagesFromBlock={(srcIdx, refs) => removeImagesFromBlock(srcIdx, refs)}
                            onMoveImagesAcrossBlocks={(srcIdx, refs, tgtIdx, updatedTgt) => moveImagesBetweenBlocks(srcIdx, refs, tgtIdx, updatedTgt)}
                            assetsByUrl={assetsByUrl}
                            onUpdateLibraryCaption={onUpdateLibraryCaption}
                            highlighted={highlightedBlockIndex === index}
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

        {(gallery.blocks || []).length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--ink-4)' }}>No blocks yet</p>
        )}

      </div>

      {/* Add Block */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--rule)' }}>
        <button
          onClick={(e) => {
            if (showBlockMenu) { setShowBlockMenu(false); return; }
            setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
            setInsertAtIndex(null);
            setShowBlockMenu(true);
          }}
          className="w-full py-2.5 transition-colors"
          style={{
            ...overlineStyle,
            background: 'var(--paper-2)',
            border: '1px solid var(--rule)',
            color: 'var(--ink-2)',
          }}
        >
          + Add Block
        </button>
      </div>

      {showBlockMenu && (
        <BlockTypeMenu
          onAdd={addBlock}
          anchorRect={menuAnchorRect}
          onClose={() => { setShowBlockMenu(false); setInsertAtIndex(null); }}
        />
      )}
    </div>
  );
})

export default BlockBuilder;
