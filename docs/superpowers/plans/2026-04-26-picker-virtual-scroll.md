# Picker Virtual Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CSS `columnCount` masonry in `LibraryTab` with viewport-aware virtual scrolling so only visible images are mounted and fetched.

**Architecture:** Port the `computeLayout` + `visibleItems` pattern from `PhotoGrid` into `LibraryTab`. A 3-column masonry layout assigns absolute positions to each item; a scroll listener tracks `scrollTop`; only items within `[scrollTop - OVERSCAN, scrollTop + containerSize.height + OVERSCAN]` are rendered.

**Tech Stack:** React hooks (`useState`, `useMemo`, `useEffect`, `useRef`, `useCallback`), ResizeObserver, requestAnimationFrame

---

## File Map

- **Modify:** `components/admin/gallery-builder/PhotoPickerModal.js`
  - `LibraryTab` function: replace CSS masonry with virtual scroll
  - `PickerTile`: remove `aspectRatio` style (outer container now controls dimensions)
  - No other files change

---

### Task 1: Add layout constants and `computePickerLayout`

**Files:**
- Modify: `components/admin/gallery-builder/PhotoPickerModal.js`

- [ ] **Step 1: Add constants and layout function after existing `PICKER_BASE_W` constants**

Open `PhotoPickerModal.js`. After the existing constants block (lines ending with `const PICKER_BASE_W = 420;`), add:

```js
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
```

- [ ] **Step 2: Verify the app still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add components/admin/gallery-builder/PhotoPickerModal.js
git commit -m "feat(picker): add computePickerLayout for virtual scroll"
```

---

### Task 2: Add scroll tracking state and refs to `LibraryTab`

**Files:**
- Modify: `components/admin/gallery-builder/PhotoPickerModal.js` — `LibraryTab` function

- [ ] **Step 1: Add scroll state, refs, and ResizeObserver to `LibraryTab`**

In `LibraryTab`, after the existing `const searchBoxRef = useRef(null);` line, add:

```js
const gridScrollRef = useRef(null);
const gridRafRef = useRef(null);
const [scrollTop, setScrollTop] = useState(0);
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
```

- [ ] **Step 2: Add ResizeObserver effect to `LibraryTab`**

After the existing click-outside `useEffect` in `LibraryTab`, add:

```js
useEffect(() => {
  const el = gridScrollRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

- [ ] **Step 3: Add rAF-throttled scroll handler**

After the ResizeObserver effect, add:

```js
const handleGridScroll = useCallback(() => {
  if (gridRafRef.current) return;
  gridRafRef.current = requestAnimationFrame(() => {
    setScrollTop(gridScrollRef.current?.scrollTop ?? 0);
    gridRafRef.current = null;
  });
}, []);
```

- [ ] **Step 4: Verify the app still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: `200`

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/PhotoPickerModal.js
git commit -m "feat(picker): add scroll tracking state and ResizeObserver to LibraryTab"
```

---

### Task 3: Compute layout and visible items in `LibraryTab`

**Files:**
- Modify: `components/admin/gallery-builder/PhotoPickerModal.js` — `LibraryTab` function

- [ ] **Step 1: Add layout and visibleItems memos**

In `LibraryTab`, after the `filtered` useMemo, add:

```js
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
```

- [ ] **Step 2: Verify the app still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add components/admin/gallery-builder/PhotoPickerModal.js
git commit -m "feat(picker): compute layout positions and visible items"
```

---

### Task 4: Replace CSS masonry with virtual scroll rendering

**Files:**
- Modify: `components/admin/gallery-builder/PhotoPickerModal.js` — `LibraryTab` render

- [ ] **Step 1: Replace the image grid div**

In `LibraryTab`'s return, find this block:

```jsx
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
```

Replace it with:

```jsx
<div
  ref={gridScrollRef}
  className="flex-1 overflow-y-auto scroll-quiet"
  onScroll={handleGridScroll}
  style={{ position: 'relative' }}
>
  {loading ? (
    <div className="text-center py-12" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading…</div>
  ) : filtered.length === 0 ? (
    <div className="text-center py-12" style={{ fontSize: 11, color: 'var(--text-muted)' }}>No photos found</div>
  ) : (
    <div style={{ position: 'relative', height: totalHeight + PICKER_PADDING * 2 }}>
      {visibleItems.map(({ index, x, y, width, height }) => {
        const asset = filtered[index];
        const key = asset.assetId || asset.publicUrl;
        const isSelected = selected.includes(key);
        return (
          <div
            key={key}
            style={{ position: 'absolute', left: x, top: y + PICKER_PADDING, width, height }}
          >
            <PickerTile
              asset={asset}
              isSelected={isSelected}
              onToggle={() => toggle(asset)}
              onPreview={() => onPreview && onPreview(asset)}
            />
          </div>
        );
      })}
    </div>
  )}
</div>
```

- [ ] **Step 2: Update `PickerTile` — remove `aspectRatio` style**

The outer `div` in `PickerTile` currently has `aspectRatio: ratio` in its style. Now that the parent `div` in `LibraryTab` controls exact `width` and `height`, the `aspectRatio` style is redundant and should be removed to prevent conflicts.

Find in `PickerTile`:
```jsx
      style={{
        aspectRatio: ratio,
        background: placeholderColor(asset.assetId),
        boxShadow: isSelected
```

Replace with:
```jsx
      style={{
        background: placeholderColor(asset.assetId),
        boxShadow: isSelected
```

Also remove the `ratio` variable declaration since it's no longer used:
```js
  const ratio = asset.width && asset.height ? `${asset.width} / ${asset.height}` : '3 / 2';
```
Delete that line entirely.

- [ ] **Step 3: Open the app and test the picker**

1. Navigate to `http://localhost:3000/admin`
2. Select a page with blocks
3. Click "Add Photos" on a block
4. Verify: picker opens, images are visible (not blank placeholders)
5. Scroll the picker — images above/below viewport should mount/unmount in the DOM (check via browser DevTools Elements panel)
6. Verify filters, search, and collection tabs still work

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/PhotoPickerModal.js
git commit -m "feat(picker): virtual scroll — only render visible images"
```
