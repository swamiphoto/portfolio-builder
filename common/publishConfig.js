// Server-side only. Orchestrates a publish: persist the draft, write the
// published snapshot the public site reads, archive a history snapshot, prune.
import { uploadJSON, listFiles, deleteFiles } from './gcsClient'
import { writeSiteConfig, writePublishedSiteConfig } from './siteConfig'
import { getUserHistoryPrefix, getUserHistoryPath } from './gcsUser'

// Matches history/site-config-{ts}.json directly under history/, but NOT
// history/autosave/site-config-{ts}.json — the autosave subfolder is pruned
// separately and must be left alone here.
const PUBLISH_SNAPSHOT_RE = /\/history\/site-config-(\d+)\.json$/

/**
 * Delete all but the newest `keep` publish snapshots under a user's history/
 * prefix. Ignores anything under history/autosave/.
 * @param {string} userId
 * @param {number} keep
 */
export async function pruneHistory(userId, keep = 20) {
  // common/gcsClient.listFiles returns an array of plain Key strings (see
  // gcsClient.js) — no object wrapping, so no k.key/k.Key guess needed.
  const keys = await listFiles(getUserHistoryPrefix(userId))
  const snaps = keys
    .map((key) => {
      const m = key && key.match(PUBLISH_SNAPSHOT_RE)
      return m ? { key, ts: Number(m[1]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts)

  const excess = snaps.slice(0, Math.max(0, snaps.length - keep)).map((s) => s.key)
  if (excess.length) await deleteFiles(excess)
}

/**
 * Publish a site config: write the draft and published copies with the same
 * server-generated timestamp (so the draft isn't immediately "dirty" again),
 * archive a history snapshot, then prune old snapshots.
 * @param {string} userId
 * @param {object} config
 * @returns {Promise<{ publishedAt: number }>}
 */
export async function publishSiteConfig(userId, config) {
  const ts = Date.now()
  await writeSiteConfig(userId, config, { updatedAt: ts })
  await writePublishedSiteConfig(userId, config, ts)
  await uploadJSON(getUserHistoryPath(userId, ts), config)
  await pruneHistory(userId, 20)
  return { publishedAt: ts }
}
