# Themes

A theme is **data, not code**. The base registry (`base.js`) owns every variant
menu, layout renderer, empty state, alignment, font slot, and button style. A
theme supplies a palette + fonts + a few taste choices, and inherits the rest.

## Shape

```js
export const santorini = {
  id: 'santorini',          // unique, url-safe
  name: 'Santorini',
  navStyle: 'left-rail',    // 'cover-embedded' | 'left-rail' | ...
  tokens: {
    '--theme-bg': '#fff',
    '--theme-text': '#111',
    '--theme-text-muted': '#666',
    fonts: {                // font slot id -> CSS font-family
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {},            // optional; omit and everything still works
}
```

Register it in `index.js` (`THEMES` + `THEME_LIST`). That's it — the theme now
has photo/photos (stacked/masonry/grid/square)/text/video/testimonial/contact
popups, cover full/partial, and solid/outline buttons, all inherited.

## Override grammar (all optional, per block type)

| Key | Effect |
|-----|--------|
| `defaultVariant` | change the default layout/size |
| `defaultAlign` / `defaultFont` / `defaultButtonStyle` | change other defaults |
| `labels: { id: 'New Label' }` | rename a variant's label (id stays shared) |
| `hide: [ids]` | remove variants from this theme's menu |
| `add: [{ id, label }]` | append a theme-only variant (needs render support) |

**Never** re-declare the variant menu in a theme. Change the base to add a
variant everywhere; use overrides to diverge locally. Selections are stored per
theme in `block.themeState[themeId].variant`, so switching themes is lossless.

**Out of scope today:** dynamic loading of third-party theme packages. This
contract is exactly what such a loader would consume later.
