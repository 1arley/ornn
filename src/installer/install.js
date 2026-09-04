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

function copyPrivateFiles(files, dest, dryRun) {
  for (const file of files || []) {
    const target = join(dest, ...file.dest.split("/"));
    if (!dryRun) {
      fs.mkdirSync(join(target, ".."), { recursive: true });
      fs.copyFileSync(file.src, target);
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
    copyPrivateFiles(skill.privateFiles, dest, dryRun);
    results.push({ name: skill.name, status: "installed", dest });
  }
  return results;
}
