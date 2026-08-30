/**
 * providers.js — Destination profile registry (data-driven)
 *
 * Loads agent destination profiles from catalog/providers.json at runtime.
 * The catalog is the single source of truth: adding an agent means adding an
 * entry there — no code changes. Detection is advisory evidence, never an
 * implicit claim of support.
 *
 * Each provider exposes:
 *   id, name, type ("profile"),
 *   adapterName, adapter (transformation fn),
 *   projectPath, globalPath (resolved, "~" expanded),
 *   detect: array of boolean checks used by detectProviders()
 */

import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAdapter } from "./adapters/index.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_CATALOG = join(ROOT, "catalog", "providers.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function binExists(name) {
  const r = spawnSync("which", [name], { encoding: "utf8" });
  return r.status === 0;
}

function dirExists(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function expandHome(p) {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return join(os.homedir(), p.slice(2));
  return p;
}

function toAbs(p, projectRoot) {
  return resolve(expandHome(p.startsWith(".") ? join(projectRoot, p) : p));
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

/**
 * Load and validate the provider catalog. Returns the parsed JSON document.
 * Throws with a descriptive error when the file is missing or malformed.
 */
export function loadProviderCatalog(catalogPath = DEFAULT_CATALOG) {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Provider catalog not found: ${catalogPath}`);
  }
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  } catch (e) {
    throw new Error(`Provider catalog is not valid JSON (${catalogPath}): ${e.message}`);
  }
  if (!doc || !Array.isArray(doc.profiles)) {
    throw new Error(`Provider catalog (${catalogPath}) must have a "profiles" array`);
  }
  return doc;
}

/**
 * Build provider objects from a loaded catalog document.
 */
export function buildProviders(doc) {
  return doc.profiles.map((profile) => {
    if (!profile.id || !profile.label) {
      throw new Error(`Provider catalog entry is missing "id" or "label": ${JSON.stringify(profile)}`);
    }
    const adapterName = profile.adapter || "identity";
    const adapter = getAdapter(adapterName); // throws on unknown adapter

    const detect = [];
    for (const cmd of profile.detection?.commands || []) detect.push(() => binExists(cmd));
    for (const marker of profile.detection?.globalMarkers || []) detect.push(() => dirExists(expandHome(marker)));

    const destinations = profile.destinations || {};
    const projectPath = destinations.project;
    const globalPath = destinations.global ? expandHome(destinations.global) : null;

    return {
      id: profile.id,
      name: profile.label,
      type: "profile",
      adapterName,
      adapter,
      projectPath,
      globalPath,
      detect,
      destinations,
      detection: profile.detection || {},
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _providers = null;

function catalog() {
  if (!_providers) {
    const doc = loadProviderCatalog();
    _providers = buildProviders(doc);
  }
  return _providers;
}

/**
 * Return the full provider definition by id.
 */
export function getProvider(id) {
  return catalog().find((p) => p.id === id) || null;
}

/**
 * Return all registered providers.
 */
export function getAllProviders() {
  return catalog();
}

/**
 * Return a list of provider ids that are "detected" (any check passes).
 * Detection is advisory; the user can always select a non-detected provider.
 */
export function detectProviders() {
  const detected = [];
  for (const provider of catalog()) {
    if (provider.detect.some((check) => check())) detected.push(provider.id);
  }
  return detected;
}

/**
 * Classify the evidence for a provider destination at a given scope.
 * Returns one of:
 *   "configured"   — the destination directory already exists
 *   "command found" — the agent binary is on PATH
 *   "not detected"  — no evidence found
 */
export function evidenceFor(provider, scope, projectRoot) {
  const target = resolveTarget(provider, scope, projectRoot);
  if (target && dirExists(target)) return "configured";
  if (provider.detect.some((check) => check())) return "command found";
  return "not detected";
}

/**
 * Resolve the target path for a provider given a scope.
 * `scope` is "project" or "global". `projectRoot` is used only for project scope.
 */
export function resolveTarget(provider, scope, projectRoot) {
  if (scope === "global") {
    return provider.globalPath;
  }
  if (provider.projectPath) {
    return toAbs(provider.projectPath, projectRoot);
  }
  return null;
}
