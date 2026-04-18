import { useState, useRef, useCallback, useEffect } from "react";
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
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-stone-300" />
          <div className="relative z-10 w-4 h-4 rounded-full border border-stone-400 bg-white flex items-center justify-center">
            <span className="text-[9px] font-bold text-stone-500 leading-none">+</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function BlockBuilder({
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
  onBack,
  sourcePageId,
  onMoveBlockToPage,
  className,
}) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [infoExpanded, setInfoExpanded] = useState(true);

  const { startDrag, endDrag, dropTargetPageId } = useDrag()

  const updateField = (key, value) => onChange({ ...gallery, [key]: value });

  const addBlock = (block) => {
    const blocks = [...(gallery.blocks || [])];
    if (insertAtIndex !== null) {
      blocks.splice(insertAtIndex, 0, block);
    } else {
      blocks.push(block);
    }
    onChange({ ...gallery, blocks });
    setInsertAtIndex(null);
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

  return (
    <div
      className={className || "w-72 flex-shrink-0 flex flex-col h-full bg-stone-50 border-r border-stone-200 relative z-10 text-left font-sans"}
    >
      {/* Header bar */}
      <div className="px-3 pt-3 pb-3 flex items-center gap-2 flex-shrink-0 border-b border-stone-200">
        <button onClick={onBack || onToggleExpand} className="text-stone-400 hover:text-stone-700 transition-colors text-sm leading-none">←</button>
        <span className="text-xs tracking-widest font-medium text-stone-400 flex-1">{headerLabel}</span>
        <span className="text-[10px] text-stone-400">
          {autosaveStatus === "saving" && "Saving…"}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "unsaved" && "Unsaved"}
        </span>
        {!onBack && (
          <button
            onClick={onToggleExpand}
            className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        {onPublish && (
          <button
            onClick={onPublish}
            disabled={publishing || (isPublished && !hasDraft)}
            className="text-xs font-semibold bg-stone-900 text-white px-4 py-1.5 hover:bg-stone-700 disabled:opacity-40 transition-colors"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>

      {/* All blocks — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* Info card */}
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5">
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
            onClick={() => setInfoExpanded((v) => !v)}
          >
            <span className="text-xs font-semibold text-stone-600 flex-1 tracking-wide">{infoLabel}</span>
            <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform flex-shrink-0 ${infoExpanded ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {infoExpanded && (
            <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
              <div>
                <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Name</div>
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-sm leading-snug font-medium text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent"
                  placeholder={namePlaceholder}
                  value={gallery.name || ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div>
                <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Slug</div>
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-xs leading-snug text-stone-500 font-mono outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent"
                  placeholder="slug"
                  value={gallery.slug || ""}
                  onChange={(e) => updateField("slug", e.target.value)}
                />
              </div>
              <div>
                <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Description</div>
                <AutoGrowTextarea
                  className="w-full border-b border-stone-200 p-0 pb-1 text-sm leading-snug text-stone-600 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent"
                  placeholder="Description"
                  value={gallery.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </div>

              {/* Thumbnail row */}
              <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Thumbnail</div>
              <div className="flex items-center gap-3 pt-0.5">
                <div
                  onClick={onPickThumbnail}
                  className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 cursor-pointer hover:border-stone-400 transition-colors ${gallery.thumbnailUrl ? "" : "bg-stone-50"}`}
                >
                  {gallery.thumbnailUrl ? (
                    <img src={getSizedUrl(gallery.thumbnailUrl, 'thumbnail')} alt="Cover" className="w-full h-full object-cover" onError={(e) => { if (e.target.src !== gallery.thumbnailUrl) e.target.src = gallery.thumbnailUrl }} />
                  ) : (
                    <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                    </svg>
                  )}
                </div>
                <button onClick={onPickThumbnail} className="text-xs text-stone-600 hover:text-stone-900 text-left transition-colors leading-none">
                  Select from library
                </button>
              </div>
              </div>

              {/* Unlisted toggle */}
              <div
                className="flex items-center gap-2 cursor-pointer pt-0.5"
                onClick={() => updateField("visibility", gallery.visibility === "unlisted" ? "public" : "unlisted")}
              >
                <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${gallery.visibility === "unlisted" ? "bg-stone-700" : "bg-stone-300"}`}>
                  <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${gallery.visibility === "unlisted" ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                </div>
                <span className="text-xs text-stone-500 select-none">Unlisted</span>
              </div>

              {/* Slideshow toggle */}
              <div className="flex items-center justify-between pt-0.5">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => updateField("enableSlideshow", !gallery.enableSlideshow)}
                >
                  <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${gallery.enableSlideshow ? "bg-stone-700" : "bg-stone-300"}`}>
                    <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${gallery.enableSlideshow ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                  </div>
                  <span className="text-xs text-stone-500 select-none">Include slideshow</span>
                </div>
                {gallery.enableSlideshow && gallery.slug && (
                  <Link
                    href={`/admin/galleries/${gallery.slug}/slideshow`}
                    className="text-xs text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors"
                  >
                    Customize →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

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
                  <div key={`slot-${index}`}>
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
          <p className="text-xs text-stone-400 text-center py-4">No blocks yet</p>
        )}

      </div>

      {/* Add Block */}
      <div className="p-3 border-t border-stone-200 flex-shrink-0">
        <button
          onClick={(e) => {
            if (showBlockMenu) { setShowBlockMenu(false); return; }
            setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
            setInsertAtIndex(null);
            setShowBlockMenu(true);
          }}
          className="w-full bg-white border border-stone-300 text-stone-700 text-sm font-medium py-2.5 hover:bg-stone-50 hover:border-stone-400 transition-colors"
        >
          Add Block
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
}
