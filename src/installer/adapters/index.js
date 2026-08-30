/**
 * adapters/index.js — Adapter registry
 *
 * Single source of truth mapping adapter names (as referenced from
 * catalog/providers.json) to their implementations. An unknown adapter name is
 * a hard error: the catalog must never reference an adapter that does not
 * exist, otherwise installations would silently write un-adapted content.
 */

import adaptIdentity from "./identity.js";
import adaptForClaude from "./claude.js";

const ADAPTERS = {
  identity: adaptIdentity,
  claude: adaptForClaude,
};

export function getAdapter(name) {
  const fn = ADAPTERS[name];
  if (!fn) throw new Error(`Unknown adapter: ${name}`);
  return fn;
}
