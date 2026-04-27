import { useState, useEffect, useRef, useMemo } from 'react';

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';

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
  const slugLower = node.slug.toLowerCase();
  const labelLower = leafLabel(node.slug).toLowerCase();
  if (q.includes('/')) {
    if (slugLower.startsWith(q) || q.startsWith(slugLower + '/') || slugLower === q.replace(/\/$/, '')) return true;
    return node.children.some((child) => subtreeMatches(child, q));
  }
  if (labelLower.includes(q)) return true;
  return node.children.some((child) => subtreeMatches(child, q));
}

function CollectionTreeRow({ node, depth, selectedSet, onAdd, query }) {
  const q = (query || '').toLowerCase();
  const slugLower = node.slug.toLowerCase();
  const labelLower = leafLabel(node.slug).toLowerCase();
  const hasSlash = q.includes('/');
  const selfMatches = !q || (hasSlash
    ? (slugLower.startsWith(q) || q.startsWith(slugLower + '/') || slugLower === q.replace(/\/$/, ''))
    : labelLower.includes(q));
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
            style={{ width: 14, flexShrink: 0, color: '#b0a490', fontSize: 12, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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

export default function CollectionPillsPicker({ existingSlugs, selectedSlugs, onAdd, onRemove, onCreate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const tree = useMemo(() => buildCollectionTree(existingSlugs), [existingSlugs]);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

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
      <div style={{ position: 'relative', padding: '0 14px' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Choose a collection for these uploads…"
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
          <>
          <div className="fixed inset-0 z-[29]" onClick={() => setOpen(false)} />
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
              <CollectionTreeRow key={node.slug} node={node} depth={0} selectedSet={selectedSet} onAdd={handleAdd} query={query} />
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
          </>
        )}
      </div>

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
    </div>
  );
}
