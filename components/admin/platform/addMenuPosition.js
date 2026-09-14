// Pure helper for placing an "add / start-from-template" popover relative to its
// anchor button. Prefers dropping down (natural for a button you just clicked),
// but flips up when there isn't enough room below and there's more room above,
// and always caps the height so the menu can never run off-screen — it scrolls
// internally instead. See PlatformSidebar's nav/hidden/bottom add menus.
export function addMenuPosition({
  rect,
  menuW,
  viewportW,
  viewportH,
  estMenuH = 400,
  gap = 4,
  margin = 8,
}) {
  const left = Math.min(Math.max(margin, rect.left), viewportW - menuW - margin)
  const spaceBelow = viewportH - rect.bottom - gap
  const spaceAbove = rect.top - gap
  // Drop down when it fits, or when down has at least as much room as up.
  // Only flip up when below is cramped AND above is roomier.
  const openDown = spaceBelow >= estMenuH || spaceBelow >= spaceAbove
  const maxHeight = Math.max(0, (openDown ? spaceBelow : spaceAbove) - margin)
  return openDown
    ? { placement: 'down', left, maxHeight, top: rect.bottom + gap }
    : { placement: 'up', left, maxHeight, bottom: viewportH - rect.top + gap }
}
