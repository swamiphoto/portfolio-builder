# In-article images for the Markdown text block

**Date:** 2026-09-16
**Status:** Draft for review

## Problem

In the Markdown text block editor (`components/admin/gallery-builder/MarkdownEditorPanel.js`), adding an image is broken and underpowered:

1. **Insert bug:** the image lands at the *bottom* of the article, not at the cursor. Root cause: the editor is a `contentEditable` WYSIWYG surface; opening `PhotoPickerModal` moves the selection out of the editor, so `currentBlockElement()` falls back to `root.lastElementChild` (end of document) — `MarkdownEditorPanel.js` `insertImages` / `currentBlockElement`.
2. **No removal:** an inserted image is a non-editable `data-md-image` node with no delete affordance, and the `block.images[]` bookkeeping array is never pruned.
3. **No per-image control:** every in-article image renders as a fixed full-width `<figure>` (`components/image-displays/MarkdownText.js`). No layout (centered / edge-to-edge / side-with-text-wrap), no size, no per-image caption control.

## Goals

- Insert an image **at the cursor**, not the end.
- **Remove** an image from the article (and prune `block.images`).
- **Per-image** layout, size, and caption — each image in an article can differ (one Side, one Centered).
- Controls live **on the image inside the Markdown editor panel** (the text block's own content editor) — never on the read-only site preview. This is within the existing editing model: the panel is a block-editing surface, not the preview.
- Reuse existing vocabulary: photo-block variant ids (`full-bleed` = edge-to-edge, `centered`, `side-by-side` = "Side") + sizes (L/M/S), and caption styles (`sans`/`serif`/`mono`/`accent`).

## Non-goals (this pass)

- **Drag-to-reposition** an image between paragraphs (with a drop line). Deferred to a follow-up. Interim: **move up / move down** buttons on the image control cluster.
- Any control on the site preview.
- New image directives beyond layout/size/caption/style.

## Data model

Per-image metadata is carried **inline in the single markdown string** via an attribute suffix on the image, so the block stays one portable string (no side-car array to desync):

```
![caption text](https://…/photo.jpg){layout=side size=m style=serif}
```

- Absent suffix ⇒ defaults (`layout=centered`, default size, default caption style) — fully backward compatible with existing `![](url)` content.
- Only known keys are parsed; unknown keys are dropped on round-trip.
- `caption` is the existing `alt` slot (`![caption](url)`), already rendered as `<figcaption>`.

### Layout values
- `centered` (default) — centered figure, size-aware (L/M/S width).
- `full-bleed` — edge-to-edge, ignores size (matches photo block).
- `side` — figure floats **left** (left-only for v1; right alignment deferred) and body text wraps beside it, magazine style; size sets the float width. On mobile it collapses to full-width stacked.

## Components & changes

1. **`common/markdown.js` (parser)** — extend `IMAGE_LINE` to capture an optional `{…}` suffix; parse it into `{ layout, size, style }` on the `image` node. Backward compatible.
2. **`common/markdownDom.js` (DOM ↔ markdown bridge)** — `createImageBlockNode` stores layout/size/style/caption as `data-*` attributes on the `data-md-image` wrapper; `blockElementToMarkdown` serializes them back into the `{…}` suffix. The wrapper renders a live thumbnail plus the hover control cluster mount point.
3. **`MarkdownEditorPanel.js` (editor)** —
   - **Insert-at-cursor:** capture the caret `Range` *before* opening `PhotoPickerModal`; in `insertImages`, restore/splice at that range instead of the `lastElementChild` fallback.
   - **Per-image hover controls** on each `data-md-image` node (top-right cluster, same brush glyph/size as the sidebar block brush): **✕ remove**, **design brush** (opens a small popover: Layout pills, Size pills, Caption-style pills), **caption** inline-edit field beneath the image, and interim **move up / move down**.
   - **Remove** deletes the node, re-serializes, and prunes the assetId from `block.images`.
4. **`components/image-displays/MarkdownText.js` (renderer)** — read `layout/size/style` from the image node and apply classes: centered (size widths), full-bleed, or floated `side` with text wrap + mobile stack. Caption uses `captionStyleCss` (reuse `common/captionStyles.js`).
5. **Reuse, don't reinvent** — pull layout/size ids from `common/themes/base.js` photo variants and caption styles from `common/captionStyles.js` so the vocabulary matches the rest of the app. The brush popover reuses the `PillToggle` / `DesignSection` primitives from `components/admin/platform/designControls`.

## Testing

- **`common/markdown.js`:** round-trip unit tests — `![c](u){layout=side size=m style=serif}` parses to the right node and re-serializes identically; bare `![](u)` still works; unknown keys dropped.
- **`common/markdownDom.js`:** `createImageBlockNode` ↔ `blockElementToMarkdown` preserves layout/size/style/caption through data-attrs.
- **`MarkdownEditorPanel.js`:** insert restores to the captured caret (not end); remove deletes the node and prunes `block.images`; two images can hold different layouts.
- **`MarkdownText.js`:** each layout renders the expected classes/structure; `side` floats and wraps; caption style applied.

## Phasing

- **P1 (bug):** insert-at-cursor + remove control + prune `block.images`.
- **P2 (brush):** per-image layout/size + caption + caption style via the on-image brush; renderer layouts (incl. `side` float).
- **P3 (later, not in this spec):** drag-to-reposition with a drop-line indicator. Interim move up/down ships in P2.

Delivering **P1 + P2** together per the agreed scope.
