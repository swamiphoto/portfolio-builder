import '@testing-library/jest-dom'

// jsdom doesn't implement Element.scrollTo (used by the Florence/Amsterdam wall
// shells to snap the wall back to the start when the menu opens); stub it so
// components that call it don't throw in tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {}
}
