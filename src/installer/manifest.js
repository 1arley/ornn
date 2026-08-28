/**
 * manifest.js — Installation manifest
 *
 * A JSON file at the project global root (or within the first provider's
 * target) that records what the installer manages. Used by `update` and
 * `uninstall` to avoid touching files the installer did not create.
 *
 * Default filename: .agent-engineering-skills.json
 */

import fs from "node:fs";
import { join } from "node:path";

const MANIFEST_NAME = ".agent-engineering-skills.json";

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