import generic from './generic'
import smugmug from './smugmug'

export const PROVIDERS = { SMUGMUG: 'smugmug', GENERIC: 'generic' }

// Priority order: specific adapters first, generic last (universal fallback).
const REGISTRY = [smugmug, generic]

export function detectAdapter(input) {
  const s = String(input || '').trim()
  if (!s) return null
  for (const adapter of REGISTRY) {
    if (adapter.enabled && adapter.detect(s)) return adapter
  }
  return null
}

export function getAdapter(id) {
  return REGISTRY.find((a) => a.id === id) || null
}
