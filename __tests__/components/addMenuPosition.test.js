import { addMenuPosition } from '@/components/admin/platform/addMenuPosition'

const VP = { viewportW: 1200, viewportH: 800 }
const MENU_W = 240

describe('addMenuPosition', () => {
  it('drops down when there is ample room below', () => {
    // Button near the top of the viewport.
    const rect = { left: 400, top: 40, bottom: 64 }
    const p = addMenuPosition({ rect, menuW: MENU_W, ...VP })
    expect(p.placement).toBe('down')
    expect(p.top).toBe(64 + 4)
    expect(p.bottom).toBeUndefined()
    expect(p.maxHeight).toBe(800 - 64 - 4 - 8) // spaceBelow - margin
  })

  it('flips up when the button is low and there is more room above', () => {
    // Button near the bottom — the bug in the screenshot (HIDDEN "+").
    const rect = { left: 400, top: 720, bottom: 744 }
    const p = addMenuPosition({ rect, menuW: MENU_W, ...VP })
    expect(p.placement).toBe('up')
    expect(p.bottom).toBe(800 - 720 + 4) // anchored above the button
    expect(p.top).toBeUndefined()
    expect(p.maxHeight).toBeGreaterThan(0)
  })

  it('never lets the menu exceed the available space (always scrollable, never off-screen)', () => {
    // Cramped both ways in a short viewport.
    const rect = { left: 100, top: 300, bottom: 324 }
    const p = addMenuPosition({ rect, menuW: MENU_W, viewportW: 1200, viewportH: 620 })
    const anchorEdge = p.placement === 'down' ? p.top : 620 - p.bottom
    // The menu's far edge must stay within the viewport.
    if (p.placement === 'down') {
      expect(p.top + p.maxHeight).toBeLessThanOrEqual(620)
    } else {
      expect(anchorEdge - p.maxHeight).toBeGreaterThanOrEqual(0)
    }
  })

  it('clamps left so the menu stays on-screen near the right edge', () => {
    const rect = { left: 1150, top: 40, bottom: 64 }
    const p = addMenuPosition({ rect, menuW: MENU_W, ...VP })
    expect(p.left).toBe(1200 - MENU_W - 8)
  })

  it('clamps left to the margin near the left edge', () => {
    const rect = { left: 2, top: 40, bottom: 64 }
    const p = addMenuPosition({ rect, menuW: MENU_W, ...VP })
    expect(p.left).toBe(8)
  })
})
