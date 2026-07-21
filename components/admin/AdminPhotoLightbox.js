import { useEffect, useState, useRef } from "react";
import { getSizedUrl } from "../../common/imageUtils";
import SellAsPrintPanel from "./print/SellAsPrintPanel";
import { resolveSellableAsset } from "../../common/print/sellAsset";
import { SEED_CATALOG } from "../../common/fulfillment/seedCatalog";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';
const SERIF = '"Cormorant Garamond", "Muse", Georgia, serif';
const BORDER = 'rgba(160,140,110,0.18)';

// Inline underlined link inside a note — matches the "profile" link in the site
// settings descriptions (inherits the note's font + muted color, underlined).
const noteLinkStyle = {
  background: 'none', border: 'none', padding: 0, font: 'inherit',
  color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
  cursor: 'pointer', transition: 'color 0.15s',
};

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

function formatAperture(value) {
  if (!value) return null;
  const n = parseFloat(String(value).replace(/^[fFƒ]\/?/, ''));
  if (isNaN(n)) return String(value);
  const r = Math.round(n * 10) / 10;
  return `ƒ${Number.isInteger(r) ? r : r.toFixed(1)}`;
}

function formatShutter(value) {
  if (!value) return null;
  const str = String(value);
  const slash = str.indexOf('/');
  const n = slash > 0
    ? parseFloat(str.slice(0, slash)) / parseFloat(str.slice(slash + 1))
    : parseFloat(str);
  if (isNaN(n)) return str;
  if (n >= 1) { const r = Math.round(n * 10) / 10; return `${Number.isInteger(r) ? r : r.toFixed(1)}s`; }
  return `1/${Math.round(1 / n)}`;
}

function slugToPath(slug) {
  return slug.split('/').map(part =>
    part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ).join(' / ');
}

function SetPicker({ current, all, onToggle }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const currentSlugs = new Set(current.map(c => c.slug));

  // Flat, sorted, filtered list — no tree, no connector lines, no indentation,
  // mirroring the library's clean set rows.
  const q = query.trim().toLowerCase();
  const items = (all || [])
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .filter(s => !q || s.slug.toLowerCase().includes(q));

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus the search field when the popover opens.
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const add = (slug, type) => {
    onToggle(slug, type, true);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Pills + inline add link share one wrapping row so "Add" sits beside the
          last pill instead of dropping to its own line. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        {current.map(({ slug, type }) => {
          const parts = slug.split('/').map(p =>
            p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          ).slice(-2);
          return (
            <span
              key={slug}
              title={slugToPath(slug)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.03em',
                padding: '2px 6px 2px 8px', borderRadius: 3,
                background: 'rgba(139,111,71,0.1)',
                border: '1px solid rgba(139,111,71,0.22)',
              }}
            >
              <span>
                {parts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: '#b0a490', margin: '0 2px' }}>/</span>}
                    <span style={{ color: i === parts.length - 1 ? '#2c2416' : '#a8967a' }}>{part}</span>
                  </span>
                ))}
              </span>
              <button
                onClick={() => onToggle(slug, type, false)}
                style={{ color: '#a8967a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1, fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.color = '#5c4f3a'}
                onMouseLeave={e => e.currentTarget.style.color = '#a8967a'}
              >
                ×
              </button>
            </span>
          );
        })}

        {all && all.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.03em',
              color: '#8b6f47', background: 'none', border: 'none',
              padding: '2px 2px', cursor: 'pointer', lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#5c4f3a'}
            onMouseLeave={e => e.currentTarget.style.color = '#8b6f47'}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>+</span> {current.length > 0 ? 'Add' : 'Add to set'}
          </button>
        )}
      </div>

      {all && all.length > 0 && open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, top: '100%', marginTop: 6,
            left: 0, right: 0,
            background: '#f9f6f1',
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(26,18,10,0.12)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 6, borderBottom: `1px solid ${BORDER}` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search sets…"
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
                color: '#2c2416', background: '#fdfbf7',
                border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 9px', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(139,111,71,0.45)'; }}
              onBlur={e => { e.target.style.borderColor = BORDER; }}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
            {items.length === 0 ? (
              <div style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 10.5, color: '#a8967a' }}>No sets match</div>
            ) : (
              items.map(({ slug, type }) => {
                const parts = slug.split('/').map(p =>
                  p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                ).slice(-2);
                const isAdded = currentSlugs.has(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    disabled={isAdded}
                    onMouseDown={e => { e.preventDefault(); if (!isAdded) add(slug, type); }}
                    style={{
                      display: 'flex', alignItems: 'center', width: '100%',
                      textAlign: 'left', background: 'transparent', border: 'none',
                      padding: '5px 12px', cursor: isAdded ? 'default' : 'pointer',
                      fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
                      color: isAdded ? '#b0a490' : '#2c2416',
                    }}
                    onMouseEnter={e => { if (!isAdded) e.currentTarget.style.background = 'rgba(44,36,22,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {parts.map((part, i) => (
                        <span key={i}>
                          {i > 0 && <span style={{ color: '#b0a490', margin: '0 2px' }}>/</span>}
                          <span style={{ color: i === parts.length - 1 ? 'inherit' : '#a8967a' }}>{part}</span>
                        </span>
                      ))}
                    </span>
                    {isAdded && <span style={{ marginLeft: 5, fontSize: 9, color: '#a8967a' }}>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Stacked settings section — hairline between each, full-width padding, mono
// uppercase title. Matches PageSettingsPopover / AlbumSidebar across the admin.
function Section({ title, children, first }) {
  return (
    <div style={{ padding: first ? '0 16px 15px' : '15px 16px', borderTop: first ? 'none' : `1px solid ${BORDER}` }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8967a', marginBottom: 9 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, children }) {
  if (!children && !value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.02em', color: '#a8967a', flexShrink: 0, width: 88 }}>{label}</span>
      {children || <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.01em', color: '#2c2416', wordBreak: 'break-all' }}>{value}</span>}
    </div>
  );
}

function FilenameValue({ filename }) {
  if (!filename) return null;
  const parts = filename.split('/');
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.01em', wordBreak: 'break-all' }}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: '#b0a490' }}>/</span>}
          <span style={{ color: i === parts.length - 1 ? '#2c2416' : '#a8967a' }}>{part}</span>
        </span>
      ))}
    </span>
  );
}

export default function AdminPhotoLightbox({ images, index, onClose, onNavigate, onCaptionChange, onCaptionChangeToLibrary, isOverride, onToggleOverride, onRevertToLibrary, allSets, onToggleSet, printStore, onSellChange, onUploadMaster, onPrintChange }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [caption, setCaption] = useState(image?.caption || '');
  const [saved, setSaved] = useState(true);
  const fileRef = useRef(null);

  // Print/sell state. When a parent wires onSellChange (the library grid), we
  // defer to it. When it doesn't (opened from a page/gallery block), the
  // lightbox handles the sell/upload API calls itself and reflects the result
  // locally via printByAsset so the toggle works from any surface.
  const [printByAsset, setPrintByAsset] = useState({});
  const effectivePrint = (image && (printByAsset[image.assetId] || image.print)) || null;

  // Apply a resolved print object to local state + notify the host so the
  // change survives closing/reopening the lightbox (host owns the asset cache).
  const applyPrint = (assetId, print) => {
    setPrintByAsset((prev) => ({ ...prev, [assetId]: print }));
    onPrintChange?.(assetId, print);
  };

  const selfSell = async (assetId, next) => {
    const prevPrint = printByAsset[assetId] || image?.print || {};
    // Optimistic: compute the real available sizes client-side (same pure
    // resolver the server uses) so the toggle is instant AND correct — no
    // "too small" flash while waiting on the round-trip.
    const { print: optimistic } = resolveSellableAsset(
      { ...image, print: prevPrint }, SEED_CATALOG, printStore?.markup || 3, next
    );
    applyPrint(assetId, optimistic);
    try {
      const res = await fetch('/api/admin/print/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, sellable: next }),
      });
      if (!res.ok) {
        console.error('print sell failed', res.status, await res.text().catch(() => ''));
        applyPrint(assetId, prevPrint);
        return;
      }
      const { print } = await res.json();
      applyPrint(assetId, print);
    } catch (e) {
      console.error('print sell error', e);
      applyPrint(assetId, prevPrint);
    }
  };

  const selfUpload = async (assetId, file) => {
    try {
      const res = await fetch(
        `/api/admin/print/upload-master?assetId=${encodeURIComponent(assetId)}&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
        { method: 'POST', body: file }
      );
      if (!res.ok) { console.error('print master upload failed', res.status, await res.text().catch(() => '')); return; }
      const { print } = await res.json();
      applyPrint(assetId, print);
    } catch (e) { console.error('print master upload error', e); }
  };

  const handleSell = (next) =>
    onSellChange ? onSellChange(image.assetId, next) : selfSell(image.assetId, next);
  const handleUploadMaster = (file) =>
    onUploadMaster ? onUploadMaster(image.assetId, file) : selfUpload(image.assetId, file);

  useEffect(() => {
    setCaption(image?.caption || '');
    setSaved(true);
  }, [index, image?.caption]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  const saveCaption = () => {
    if (caption === (image?.caption || '')) return;
    if (isOverride?.(index)) {
      onCaptionChange?.(index, caption);
    } else {
      onCaptionChangeToLibrary?.(index, caption);
    }
    setSaved(true);
  };

  if (!image) return null;

  const filename = image.originalFilename || image.url?.split('/').pop();
  const sizeLabel = formatBytes(image.bytes);
  const dimensions = image.width && image.height ? `${image.width} × ${image.height}` : null;
  const uploadedAt = formatDate(image.createdAt || image.updatedAt);

  const c = image.capture || {};
  const capturedAt = formatDate(c.capturedAt || c.dateTaken || c.dateTimeOriginal || c.dateTime);
  const camera = c.cameraModel || (c.make && c.model ? [c.make, c.model].filter(Boolean).join(' ') : null);
  const lens = c.lens || c.lensModel;
  const focal = (c.focalLength || c.focalLengthMm) ? `${Math.round(c.focalLength || c.focalLengthMm)}mm` : null;
  const aperture = formatAperture(c.aperture || c.fNumber);
  const shutter = formatShutter(c.shutterSpeed || c.exposureTime);
  const iso = c.iso ? `ISO ${c.iso}` : null;
  const dateTaken = formatDate(c.dateTaken || c.dateTimeOriginal || c.dateTime);
  const flash = c.flash != null ? (c.flash ? 'Fired' : 'No flash') : null;
  const gps = c.gpsLatitude && c.gpsLongitude
    ? `${parseFloat(c.gpsLatitude).toFixed(4)}, ${parseFloat(c.gpsLongitude).toFixed(4)}`
    : null;

  const blockIds = image.usage?.blockIds || [];
  const sets = image.sets || [];

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(20,14,8,0.96)' }}
      onClick={onClose}
    >
      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative min-w-0"
        style={{ padding: 48 }}
        onClick={e => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            aria-label="Previous image"
            onClick={() => onNavigate(index - 1)}
            className="absolute flex items-center justify-center transition-colors"
            style={{ left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L1 7l6 6" />
            </svg>
          </button>
        )}

        <img
          src={getSizedUrl(image.url, 'display')}
          alt={caption || ''}
          onError={(e) => {
            // Older images stored before display variants were generated have no
            // /display/ object. Fall back to the original so the lightbox never blanks.
            if (image.url && e.currentTarget.src !== image.url) e.currentTarget.src = image.url
          }}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />

        {hasNext && (
          <button
            aria-label="Next image"
            onClick={() => onNavigate(index + 1)}
            className="absolute flex items-center justify-center transition-colors"
            style={{ right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l6 6-6 6" />
            </svg>
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 16, fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.25)' }}>
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Metadata panel */}
      <div
        className="flex flex-col flex-shrink-0 overflow-y-auto scroll-quiet"
        style={{ width: 280, background: '#f4efe8', borderLeft: '1px solid rgba(160,140,110,0.15)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button — absolutely positioned so it doesn't push content down */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', color: '#7a6b55', zIndex: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
          </svg>
        </button>

        <div style={{ padding: '44px 0 12px', display: 'flex', flexDirection: 'column' }}>

          {/* Caption */}
          <Section title="Caption" first>
            <textarea
              value={caption}
              rows={3}
              placeholder="Add a caption…"
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: SERIF, fontStyle: 'italic', fontSize: 14,
                color: '#2c2416',
                background: '#ede8df',
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                padding: '8px 10px',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.4,
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(139,111,71,0.45)'}
              onBlur={e => { e.target.style.borderColor = BORDER; saveCaption(); }}
              onChange={e => { setCaption(e.target.value); setSaved(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); } }}
            />
            {!saved && (
              <p style={{ fontFamily: MONO, fontSize: 9.5, color: '#b0a490', margin: 0 }}>Enter or click away to save</p>
            )}
          </Section>

          {/* File — metadata + the high-res version that powers downloads & larger prints */}
          <Section title="File">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Filename"><FilenameValue filename={filename} /></Row>
              <Row label="Dimensions" value={dimensions} />
              <Row label="Size" value={sizeLabel} />
              <Row label="Captured" value={capturedAt} />
              <Row label="Uploaded" value={uploadedAt} />
            </div>
            <p style={{ margin: '9px 0 0', fontSize: 11.5, color: '#a8967a', lineHeight: 1.45 }}>
              {effectivePrint?.masterStorageKey ? (
                <>A larger version is uploaded (enables larger prints and high-res downloads).{' '}
                  <button type="button" onClick={() => fileRef.current?.click()} style={noteLinkStyle}
                    onMouseEnter={e => { e.currentTarget.style.color = '#2c2416' }} onMouseLeave={e => { e.currentTarget.style.color = 'inherit' }}>
                    Replace it
                  </button>.
                </>
              ) : (
                <>You can{' '}
                  <button type="button" onClick={() => fileRef.current?.click()} style={noteLinkStyle}
                    onMouseEnter={e => { e.currentTarget.style.color = '#2c2416' }} onMouseLeave={e => { e.currentTarget.style.color = 'inherit' }}>
                    upload a larger version
                  </button>{' '}
                  to unlock larger prints and high-res downloads.
                </>
              )}
            </p>
          </Section>

          {/* Prints — sell toggle + quality; the file that powers it lives above */}
          <Section title="Prints">
            <SellAsPrintPanel
              asset={image ? { ...image, print: effectivePrint } : image}
              onSellChange={handleSell}
            />
          </Section>

          {/* Camera / EXIF — always present for a stable panel; empty state when
              the file carries no camera metadata (screenshots, stripped exports). */}
          <Section title="Camera">
            {(camera || lens || focal || aperture || shutter || iso || flash || gps) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Row label="Camera" value={camera} />
                <Row label="Lens" value={lens} />
                <Row label="Focal" value={focal} />
                <Row label="Aperture" value={aperture} />
                <Row label="Shutter" value={shutter} />
                <Row label="ISO" value={iso} />
                <Row label="Flash" value={flash} />
                <Row label="GPS" value={gps} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11.5, color: '#c4b49a', fontStyle: 'italic', lineHeight: 1.45 }}>
                No camera details in this file.
              </p>
            )}
          </Section>

          {blockIds.length > 0 && (
            <Section title="Used in pages">
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#2c2416' }}>
                {blockIds.length} block{blockIds.length !== 1 ? 's' : ''}
              </span>
            </Section>
          )}

          {/* Sets */}
          <Section title="Sets">
            <SetPicker
              current={sets}
              all={allSets}
              onToggle={(slug, type, add) => onToggleSet && onToggleSet(slug, type, add)}
            />
          </Section>

        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Upload a higher-resolution version"
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleUploadMaster(f); }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
