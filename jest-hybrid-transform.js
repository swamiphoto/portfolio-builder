// jest-hybrid-transform.js
// Hybrid transform: uses babel-jest for ClientEngagementContext.js so that named
// exports have `configurable: true` (enabling jest.spyOn on useClientEngagement).
// All other files are compiled by the standard Next.js SWC jest-transformer.
//
// Background: SWC's CJS output uses Object.defineProperty(exports, name, { get, enumerable })
// with configurable: false, which prevents jest.spyOn from working on named exports.
// Babel's CJS output uses `exports.name = value` (plain assignment) which is
// configurable: true, writable: true — compatible with jest.spyOn.

const { createTransformer: createSwcTransformer } = require('next/dist/build/swc/jest-transformer')
const babelJest = require('babel-jest')

// Files that must be compiled with babel (so their exports are spy-able)
const BABEL_FILES = /[\\/]components[\\/]image-displays[\\/]engagement[\\/]ClientEngagementContext\.js$/

// jest calls createTransformer(transformerConfig) — we receive the full next/jest
// jestTransformerConfig (jsConfig, baseUrl, modularizeImports, etc.) forwarded from jest.config.js
exports.createTransformer = function createTransformer(transformerConfig) {
  const swc = createSwcTransformer(transformerConfig || {})
  const babel = (babelJest.default || babelJest).createTransformer({
    presets: ['next/babel'],
  })

  return {
    process(src, filename, options) {
      if (BABEL_FILES.test(filename)) {
        return babel.process(src, filename, options)
      }
      return swc.process(src, filename, options)
    },

    getCacheKey(src, filename, options) {
      if (BABEL_FILES.test(filename)) {
        if (typeof babel.getCacheKey === 'function') {
          return `babel:${babel.getCacheKey(src, filename, options)}`
        }
        return `babel:${filename}:${src}`
      }
      if (typeof swc.getCacheKey === 'function') {
        return `swc:${swc.getCacheKey(src, filename, options)}`
      }
      return `swc:${filename}:${src}`
    },
  }
}
