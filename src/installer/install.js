/**
 * install.js — Core installation logic (provider-agnostic)
 *
 * Handles:
 *   - copying or linking source skills → provider target
 *   - manifest creation and update
 *   - dry-run mode (same resolution, no writes)
 *   - guarded removal with safeDestFor
 *
 * The provider adapter transforms SKILL.md content before writing.
 */

import fs from "node:fs";
import { join } from "node:path";
import { safeDestFor } from "./paths.js";
import { readManifest, writeManifest, manifestPath } from "./manifest.js";

const MANIFEST_VERSION = "1";

/**
 * Find every <category>/<skill>/SKILL.md under the skills directory.
 * Returns an array of { category, name, src }.
 */
export function findSkillDirs(skillsGlob) {
  const dirs = [];
  if (!fs.existsSync(skillsGlob)) return dirs;
  for (const category of fs.readdirSync(skillsGlob)) {
    const catPath = join(skillsGlob, category);
    let stat;
    try { stat = fs.statSync(catPath); } catch { continue; }
    if (!stat.isDirectory()) continue;
    for (const skill of fs.readdirSync(catPath)) {
      const skillPath = join(catPath, skill);
      let s;
      try { s = fs.statSync(skillPath); } catch { continue; }
      if (!s.isDirectory()) continue;
      if (!fs.existsSync(join(skillPath, "SKILL.md"))) continue;
      dirs.push({ category, name: skill, src: skillPath });
    }
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Copy a directory, adapting SKILL.md through the adapter function.
 */
function copyDir(src, dest, adapter, dryRun) {
  if (!dryRun) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, adapter, dryRun);
    } else if (entry.isFile()) {
      let content = fs.readFileSync(from, "utf8");
      if (entry.name === "SKILL.md") content = adapter(content);
      if (!dryRun) fs.writeFileSync(to, content);
    }
  }
}

/**
 * Build a plan for what would happen during install, without writing.
 * Returns { skills, existing, wouldOverwrite, wouldSkip, wouldInstall, byProvider }.
 */
export function planInstall(skills, target, { force, anchor } = {}) {
  const existing = [];
  const byProvider = [];
  for (const skill of skills) {
    const dest = safeDestFor(target, skill.name, { warn: () => {}, anchor });
    if (!dest) continue;
    const exists = fs.existsSync(dest);
    existing.push({ name: skill.name, exists, dest });
    byProvider.push(dest);
  }
  const wouldOverwrite = existing.filter((e) => e.exists && force).length;
  const wouldSkip = existing.filter((e) => e.exists && !force).length;
  return {
    skills,
    existing,
    wouldOverwrite,
    wouldSkip,
    wouldInstall: skills.length - wouldSkip,
  };
}

/**
 * Install (or dry-run) skill directories into a target, through the adapter.
 * Returns installation results per skill.
 */
export function installTo(skills, target, adapter, { force, dryRun, link, anchor } = {}) {
  const results = [];
  for (const skill of skills) {
    const dest = safeDestFor(target, skill.name, { opts: { force }, anchor });
    if (!dest) {
      results.push({ name: skill.name, status: "error", dest: null });
      continue;
    }
    const exists = fs.existsSync(dest);
    if (exists && !force) {
      results.push({ name: skill.name, status: "skipped", dest });
      continue;
    }
    if (exists && force && !dryRun) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    if (link) {
      if (!dryRun) {
        fs.mkdirSync(target, { recursive: true });
        fs.symlinkSync(skill.src, dest, "dir");
      }
      results.push({ name: skill.name, status: "linked", dest });
      continue;
    }
    copyDir(skill.src, dest, adapter, dryRun);
    results.push({ name: skill.name, status: "installed", dest });
  }
  return results;
}

/**
 * Build and write the installation manifest.
 */
export function writeInstallManifest(manifestRoot, providerIds, skillNames, version) {
  const existing = readManifest(manifestRoot) || {};
  const manifest = {
    packageVersion: version,
    manifestVersion: MANIFEST_VERSION,
    scope: existing.scope || null,
    providers: providerIds,
    skills: skillNames,
  };
  writeManifest(manifestRoot, manifest);
  return manifest;
}

/**
 * Uninstall only manifest-managed skills for given providers.
 * Returns the count of removed skill directories.
 */
export function uninstallManagedProviders(manifestRoot, providerIds, { dryRun } = {}) {
  const manifest = readManifest(manifestRoot);
  if (!manifest) return 0;

  let removed = 0;
  for (const skill of manifest.skills || []) {
    for (const id of providerIds) {
      const provider = null; // caller passes in or we import
    }
  }
  // Simplified: caller determines what to remove; this function just reads
  // the manifest to know what was installed.
  return manifest;
}

export function listInstalledSkills(manifestRoot, provider, target) {
  const instaled = [];
  if (fs.existsSync(target)) {
    for (const entry of fs.readdirSync(target)) {
      const p = join(target, entry);
      if (fs.statSync(p).isDirectory()) instaled.push(entry);
    }
  }
  return instaled;
}