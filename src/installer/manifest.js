/**
 * manifest.js — Installation manifest
 *
 * A JSON file at the project root (or home for global scope) that records
 * what the installer manages. Used by `update` and `uninstall` to avoid
 * touching files the installer did not create and to operate on the exact
 * recorded targets without recomputing paths.
 *
 * v2 format records destinations explicitly (id, type, target, adapter, skills).
 * v1 format (providers array) is read for backward compatibility.
 *
 * Default filename: .ornn-forge.json
 */

import fs from "node:fs";
import { join } from "node:path";

const MANIFEST_NAME = ".ornn-forge.json";
const MANIFEST_VERSION = "2";

export function manifestPath(root) {
  return join(root, MANIFEST_NAME);
}

export function readManifest(root) {
  const path = manifestPath(root);
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function writeManifest(root, data) {
  const path = manifestPath(root);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function removeManifest(root) {
  const path = manifestPath(root);
  try {
    fs.unlinkSync(path);
  } catch {
    // not present — nothing to remove
  }
}

/**
 * Write a v2 manifest with destinations.
 */
export function writeV2Manifest(root, { scope, destinations, packageVersion, selection = [], profile = "gateway" }) {
  const manifest = {
    packageVersion,
    manifestVersion: MANIFEST_VERSION,
    scope,
    selection,
    profile,
    destinations,
  };
  writeManifest(root, manifest);
  return manifest;
}

/**
 * True when the parsed manifest uses the v2 format.
 */
export function isV2Manifest(data) {
  return data && data.manifestVersion === MANIFEST_VERSION;
}

export { MANIFEST_VERSION };
