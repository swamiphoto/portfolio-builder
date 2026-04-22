# Page Settings Flat Toggle Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Section headers from the PageSettingsPopover toggle rows, replacing them with flat compact toggle rows (toggle + label + action label + chevron), and move Privacy and Buttons editors into their own drill-in views.

**Architecture:** Add `ToggleRow` helper component. Expand `view` state to include `'password'` and `'buttons'`. The password inline expansion and button editor inline section both move into drill-in PopoverShell branches. Main view becomes: URL section → Thumbnail section → 4 flat toggle rows (Password protect, Enable slideshow, Enable client features, Custom buttons).

**Tech Stack:** React, Tailwind CSS

---

## File Structure

**Modified:**
- `components/admin/platform/PageSettingsPopover.js` — single file, ~563 lines

---

## Task 1: Restructure PageSettingsPopover main view + add password and buttons drill-ins

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js`

- [ ] **Step 1: Read the current file**

```bash
# Understand current structure before editing
```

Read `components/admin/platform/PageSettingsPopover.js` in full.

- [ ] **Step 2: Add `ToggleRow` helper component**

Insert after the `DrillHeader` component definition (around line 78) and before `export default`:

```jsx
function ToggleRow({ checked, onToggle, label, actionLabel, onDrillIn, disabled, hint }) {
  return (
    <div className="px-3 py-2.5 flex items-center border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={() => !disabled && onToggle(!checked)}
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-stone-700' : 'bg-stone-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </button>
      <div className="flex-1 ml-2 min-w-0">
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
      {checked && actionLabel && onDrillIn && (
        <button
          type="button"
          onClick={onDrillIn}
          className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0 ml-2"
        >
          {actionLabel}
          <ChevronRight />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Expand the `view` state comment**

Change:
```js
const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client'
```
to:
```js
const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client' | 'password' | 'buttons'
```

- [ ] **Step 4: Add `view === 'password'` drill-in block**

Insert immediately before the `if (view === 'slideshow')` block:

```jsx
  // ── Password drill-in ─────────────────────────────────────────────────────
  if (view === 'password') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Password" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-2">
          <input
            type="text"
            autoFocus
            className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
            placeholder="Enter password"
            value={page.password.trim()}
            onChange={(e) => update({ password: e.target.value })}
            autoComplete="off"
          />
          <textarea
            className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
            placeholder="Gate message (optional)"
            rows={2}
            value={page.passwordGateMessage || ''}
            onChange={(e) => update({ passwordGateMessage: e.target.value })}
          />
          <p className="text-[10px] text-stone-400">Not indexed by search engines.</p>
        </div>
      </PopoverShell>
    )
  }
```

- [ ] **Step 5: Add `view === 'buttons'` drill-in block**

Insert immediately after the `view === 'password'` block and before `view === 'slideshow'`:

```jsx
  // ── Buttons drill-in ──────────────────────────────────────────────────────
  if (view === 'buttons') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Buttons" onBack={() => setView('main')} />
        <div className="px-3 py-3">
          {(page.cover?.buttons || []).map((btn, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-3">
              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                  placeholder="Button label"
                  value={btn.label}
                  onChange={(e) => updateButton(i, { label: e.target.value })}
                />
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-500 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                  placeholder="URL or #anchor"
                  value={btn.href}
                  onChange={(e) => updateButton(i, { href: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => updateButton(i, { style: btn.style === 'solid' ? 'outline' : 'solid' })}
                  className="text-[10px] text-stone-500 border border-stone-200 rounded px-1.5 py-0.5 hover:border-stone-400 transition-colors whitespace-nowrap"
                >
                  {btn.style === 'solid' ? 'Solid' : 'Outline'}
                </button>
                <button
                  type="button"
                  onClick={() => removeButton(i)}
                  className="text-stone-300 hover:text-red-400 transition-colors text-sm leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addButton}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            + Add button
          </button>
          {autoButtonLabels.length > 0 && (
            <p className="text-[10px] text-stone-400 mt-2">
              Auto: {autoButtonLabels.join(' · ')}
            </p>
          )}
        </div>
      </PopoverShell>
    )
  }
```

- [ ] **Step 6: Remove the enable-toggle from the slideshow drill-in view**

In the `view === 'slideshow'` block, delete the `<div>` that contains the Toggle for "Enable slideshow" (with the `border-b` wrapper). The enable/disable is now handled from the main view's `ToggleRow`. Keep everything else (theme, music, sequence).

The block to remove looks like:
```jsx
        <div className="px-3 py-3 border-b border-stone-100">
          <Toggle checked={slideshow.enabled || false} onChange={handleEnableSlideshow} label="Enable slideshow" disabled={!canSlideshow} hint={!canSlideshow ? 'Requires 6+ photos' : undefined} />
        </div>
```

- [ ] **Step 7: Replace the main view toggle sections**

In the main view (the final `return` block), find and replace the four `<Section>` blocks (Privacy, Slideshow, Client Features, Buttons — currently after the Thumbnail section) with these four `<ToggleRow>` calls:

```jsx
      <ToggleRow
        checked={!!page.password}
        onToggle={(v) => {
          if (!v) update({ password: '', passwordGateMessage: '' })
          else update({ password: ' ' })
        }}
        label="Password protect"
        actionLabel="Configure"
        onDrillIn={() => setView('password')}
      />

      <ToggleRow
        checked={slideshow.enabled || false}
        onToggle={handleEnableSlideshow}
        label="Enable slideshow"
        actionLabel="Customize"
        onDrillIn={() => setView('slideshow')}
        disabled={!canSlideshow && !slideshow.enabled}
        hint={!canSlideshow ? 'Requires 6+ photos' : undefined}
      />

      <ToggleRow
        checked={cf.enabled || false}
        onToggle={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
        label="Enable client features"
        actionLabel="Configure"
        onDrillIn={() => setView('client')}
      />

      <ToggleRow
        checked={(page.cover?.buttons || []).length > 0}
        onToggle={(v) => {
          if (v) addButton()
          else update({ cover: { ...(page.cover || {}), buttons: [] } })
        }}
        label="Custom buttons"
        actionLabel={(page.cover?.buttons || []).length > 1 ? 'Edit' : 'Add'}
        onDrillIn={() => setView('buttons')}
      />
```

Note on the buttons row: `checked` is derived from button count (> 0), not a stored boolean. `actionLabel` is "Edit" when >1 button exists (since when exactly 1 exists it was just added and "Add" makes more sense), or "Add" when there's exactly 1. Actually keep it simple: "Add" when 0 buttons (but toggle is on = 1 just added), "Edit" when >= 1. Since the toggle is `checked` when count > 0, and `actionLabel` only shows when `checked`, use: `(page.cover?.buttons || []).length === 1 ? 'Add' : 'Edit'` — shows "Add" for the first empty button, "Edit" when there are 2 or more. Actually simplest: always show "Edit" when checked, since there's always at least 1 button in the list when checked.

Use `actionLabel="Edit"` (hardcoded) for the buttons row — it's always at least 1 button when the row is checked.

Wait, but the user said "add or edit". Let me use: `actionLabel={(page.cover?.buttons || []).some(b => b.label) ? 'Edit' : 'Add'}` — shows "Add" when all buttons are empty-label, "Edit" when at least one has a label.

- [ ] **Step 8: Run tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -10
```

Expected: Same pass/fail count as before (21 normalizer tests + 142 others passing, 4 pre-existing failures unchanged).

- [ ] **Step 9: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat: flat toggle rows in PageSettingsPopover — password and buttons as drill-ins"
```
