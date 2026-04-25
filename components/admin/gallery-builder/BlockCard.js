import { useState, useRef, useEffect } from "react";
import { getSizedUrl } from "../../../common/imageUtils";
import { normalizeImageRefs, buildMultiImageFields } from "../../../common/assetRefs";
import { resolveCaption, isCaptionOverridden } from '../../../common/captionResolver';
import { useDrag } from '../../../common/dragContext';
import DesignPopover from "./DesignPopover";
import AdminPhotoLightbox from "../AdminPhotoLightbox";

const TYPE_LABELS = {
  photo: "Photo",
  photos: "Photos",
  stacked: "Photos",
  masonry: "Photos",
  text: "Text",
  video: "Video",
  "page-gallery": "Page Gallery",
};

const INPUT = "w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug text-[#2c2416]";

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
      style={{ background: 'var(--card)' }}
      onClick={onPreview}
    >
      <img
        src={getSizedUrl(imageRef.url, 'thumbnail')}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => { if (e.target.src !== imageRef.url) e.target.src = imageRef.url }}
      />
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

export default function BlockCard({
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
}) {
  const isPhotoBlock = block.type === "photos" || block.type === "stacked" || block.type === "masonry";
  const dragPhotoIndex = useRef(null);
  const blockKeyRef = useRef(Math.random().toString(36).slice(2));
  const { startDrag, endDrag } = useDrag()
  const hasDesign = block.type === "photo" || block.type === "photos" || block.type === "stacked" || block.type === "masonry" || block.type === "text" || block.type === "video";

  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [photoDropHover, setPhotoDropHover] = useState(false);
  const [gridDropHover, setGridDropHover] = useState(false);
  const lastSelectedRef = useRef(null);
  const menuRef = useRef(null);
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
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
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

  return (
    <div
      className="rounded-xl overflow-hidden mb-1.5 group/card transition-colors duration-150"
      style={{ background: highlighted ? 'var(--panel-hover)' : 'var(--card)', border: '1px solid var(--card-border)' }}
      onDragEnter={isPhotoBlock ? (e) => { e.preventDefault(); setGridDropHover(true); } : undefined}
      onDragOver={isPhotoBlock ? handleDragOver : undefined}
      onDragLeave={isPhotoBlock ? handleDragLeave : undefined}
      onDrop={isPhotoBlock ? handleDrop : undefined}
    >
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span
          {...dragHandleProps}
          className="cursor-grab text-sm leading-none select-none flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ⠿
        </span>

        <button
          className="text-xs font-semibold tracking-wide flex-1 text-left transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setExpanded((v) => !v)}
        >
          {TYPE_LABELS[block.type] || block.type}
        </button>

        {/* Hover-reveal actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {(block.type === "photo" || isPhotoBlock) && (
            <button
              onClick={onAddPhotos}
              title="Add photos"
              className="w-6 h-6 flex items-center justify-center transition-colors text-base leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
              +
            </button>
          )}

          {hasDesign && (
            <div className="relative">
              <button
                ref={designBtnRef}
                onClick={() => setShowDesign((v) => !v)}
                title="Design"
                className="w-6 h-6 flex items-center justify-center transition-colors"
                style={{ color: showDesign ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <PaintbrushIcon />
              </button>
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-6 h-6 flex items-center justify-center transition-colors text-sm leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
              ⋯
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 py-1 w-36 rounded-xl overflow-hidden" style={{ background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', border: '1px solid var(--card-border)' }}>
                <button
                  onClick={() => { setShowMenu(false); onRemove(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-[#ede8e0] transition-colors whitespace-nowrap"
                >
                  Remove block
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="transition-colors flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "rotate-180"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 pt-3 space-y-2.5" style={{ borderTop: '1px solid var(--border)' }}>

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
                      onError={(e) => { if (e.target.src !== block.imageUrl) e.target.src = block.imageUrl }}
                    />
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
                    className={`flex flex-col items-center justify-center h-20 border-dashed cursor-pointer transition-colors gap-0.5 ${photoDropHover ? 'border-blue-400 bg-blue-50' : 'hover:border-[#a08a68]'}`}
                    style={photoDropHover ? {} : { background: 'var(--card)', border: '1px dashed var(--card-border)' }}
                  >
                    <span className={`text-xs ${photoDropHover ? 'text-blue-600' : ''}`} style={photoDropHover ? {} : { color: 'var(--text-secondary)' }}>{photoDropHover ? 'Drop photo here' : 'Drag a photo here'}</span>
                    {!photoDropHover && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or <span className="underline underline-offset-2 transition-colors" style={{ color: 'var(--text-primary)' }}>select from library</span></span>}
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
                  className={`flex flex-col items-center justify-center h-16 border-dashed cursor-pointer transition-colors gap-0.5 ${gridDropHover ? 'border-blue-400 bg-blue-50' : 'hover:border-[#a08a68]'}`}
                  style={gridDropHover ? {} : { background: 'var(--card)', border: '1px dashed var(--card-border)' }}
                >
                  <span className={`text-xs ${gridDropHover ? 'text-blue-600' : ''}`} style={gridDropHover ? {} : { color: 'var(--text-secondary)' }}>{gridDropHover ? 'Drop photos here' : 'Drag photos here'}</span>
                  {!gridDropHover && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or <span className="underline underline-offset-2 transition-colors" style={{ color: 'var(--text-primary)' }}>select from library</span></span>}
                </div>
              ) : (
                <div className={`grid grid-cols-3 gap-px transition-all ${gridDropHover ? 'bg-blue-400 opacity-60' : 'bg-[#cfc4b2]'}`}>
                  {(() => {
                    const thumbRefs = blockImageRefs.map(r => ({
                      ...r,
                      caption: resolveCaption(r, assetsByUrl || {}),
                    }));
                    return thumbRefs.map((ref, i) => (
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
                              if (parsed.sourceBlockKey !== blockKeyRef.current) return; // cross-block drag — let grid handle
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
                    ));
                  })()}
                </div>
              )}
            </>
          )}

          {/* Text */}
          {block.type === "text" && (
            <textarea
              className={`${INPUT} resize-none`}
              placeholder="Write something…"
              rows={3}
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
                <p className="text-xs text-stone-400">No other pages yet.</p>
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
