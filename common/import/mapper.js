import { mapOutlineToBlocks as rulesMap } from './rulesMapper'

// The structural mapper interface. v1 has one implementation (deterministic
// rules, keyless). A future AI implementation plugs in here behind the same
// signature, selected by IMPORT_MAPPER / key presence.
export function mapOutlineToBlocks(outline) {
  return rulesMap(outline)
}
