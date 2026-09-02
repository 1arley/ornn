/**
 * orchestrator.js — install/update/uninstall/list/doctor orchestration
 *
 * The CLI calls this layer; the layer owns the destination resolution, scope,
 * manifest lifecycle, and safety validation. Never touches the source skills.
 *
 * Since manifest v2, the manifest records explicit destinations (target path,
 * adapter, skills). `update` and `uninstall` operate on those recorded targets
 * directly — they never recompute paths from the catalog, so a later catalog
 * change cannot orphan or misplace managed files.
 */

import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { getAllProviders, getProvider, detectProviders, resolveTarget } from "./providers.js";
import { getAdapter } from "./adapters/index.js";
import { findSkillDirs, installTo, planInstall } from "./install.js";
import { readManifest, writeV2Manifest, isV2Manifest, manifestPath, removeManifest } from "./manifest.js";
import { resolveProjectRoot, resolveManifestRoot, safeDestFor } from "./paths.js";
import { resolveSkillSelection, sourceSkills } from "../library/catalog.js";

const require = createRequire(import.meta.url);
const PKG = require("../../package.json");

const UNIVERSAL = {
  id: "universal",
  name: "Universal .agents/skills",
  type: "universal",
  projectPath: ".agents/skills",
  globalPath: join(os.homedir(), ".agents", "skills"),
  adapterName: "identity",
  adapter: (content) => content,
};

// ---------------------------------------------------------------------------
// Symlink containment
// ---------------------------------------------------------------------------

/**
 * For project scope the project root is the trust boundary: a malicious repo
 * can commit `.claude` (or `.agents`) as a symlink and every purely lexical
 * path check would still pass while writes land outside the project. Global
 * scope has no repo-planted-symlink vector (the attacker does not control the
 * user's home) and a symlinked ~/.claude is a legitimate dotfiles pattern, so
 * no anchor is applied there.
 */
function installAnchor(scope, projectRoot) {
  return scope === "global" ? null : projectRoot;
}

// ---------------------------------------------------------------------------
// Skill source
// ---------------------------------------------------------------------------

export function skillSourceDir(packageRoot) {
  return join(packageRoot, "skills");
}

export function listSourceSkills(packageRoot) {
  return findSkillDirs(skillSourceDir(packageRoot));
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

export function resolveInstallTarget(provider, scope, projectRoot) {
  if (provider.id === "universal") {
    return scope === "global" ? UNIVERSAL.globalPath : join(projectRoot, UNIVERSAL.projectPath);
  }
  return resolveTarget(provider, scope, projectRoot);
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Plan an installation for a set of providers/destinations.
 * Returns a structured plan (no writes).
 */
export function buildPlan({ providers, scope, projectRoot, packageRoot, force, skills: selectedSkills = null }) {
  const skills = selectedSkills || listSourceSkills(packageRoot);
  const plans = [];
  for (const provider of providers) {
    const anchor = provider.type === "custom" ? null : installAnchor(scope, projectRoot);
    const target = resolveInstallTarget(provider, scope, projectRoot);
    const plan = planInstall(skills, target, { force, anchor });
    plans.push({ provider, target, ...plan });
  }
  return { skills, plans };
}

/**
 * Build a v2 manifest destination record from a provider and its plan.
 */
function destinationFor(provider, target, skillNames) {
  return {
    id: provider.id,
    type: provider.type || "profile",
    label: provider.name,
    target,
    adapter: provider.adapterName || "identity",
    skills: skillNames,
  };
}

/**
 * Execute an installation. Returns a summary and writes a v2 manifest.
 */
export function installProviders({ providers, scope, projectRoot, packageRoot, force, dryRun, link, skills: selectedSkills = null, selection = [] }) {
  const { skills, plans } = buildPlan({ providers, scope, projectRoot, packageRoot, force, skills: selectedSkills });
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const skillNames = skills.map((s) => s.name);
  const summary = [];

  for (const plan of plans) {
    const anchor = plan.provider.type === "custom" ? null : installAnchor(scope, projectRoot);
    const adapter = plan.provider.adapter;
    const results = installTo(skills, plan.target, adapter, { force, dryRun, link, anchor });
    const installed = results.filter((r) => r.status === "installed" || r.status === "linked").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;
    const overwritten = results.filter((r) => r.status === "installed" && plan.existing.some((e) => e.dest === r.dest && e.exists)).length;
    summary.push({
      provider: plan.provider,
      target: plan.target,
      installed,
      skipped,
      errored,
      overwritten,
      results,
    });
  }

  const destinations = plans.map((plan) => destinationFor(plan.provider, plan.target, skillNames));

  if (!dryRun) {
    writeV2Manifest(manifestRoot, { scope, destinations, packageVersion: PKG.version, selection });
  }

  return { skills, summary, manifestRoot, destinations };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Read the manifest and return its destinations.
 * v1 manifests (providers array) are converted to v2 destinations through the
 * catalog so historical installs keep working.
 */
export function findInstalledDestinations(scope, projectRoot) {
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const manifest = readManifest(manifestRoot);
  if (!manifest) return { manifest, destinations: [] };
  if (isV2Manifest(manifest)) {
    return { manifest, destinations: manifest.destinations || [] };
  }
  // v1 → convert provider ids to destinations via the catalog
  const providers = (manifest.providers || [])
    .map((id) => (id === "universal" ? UNIVERSAL : getProvider(id)))
    .filter(Boolean);
  const destinations = providers.map((p) => {
    const target = resolveInstallTarget(p, scope, projectRoot);
    return destinationFor(p, target, manifest.skills || []);
  });
  return { manifest, destinations };
}

export function updateProviders({ scope, projectRoot, packageRoot, force, dryRun }) {
  const { manifest, destinations } = findInstalledDestinations(scope, projectRoot);
  if (!manifest) return { found: false };
  if (destinations.length === 0) return { found: true, updated: 0 };

  const manifestRoot = resolveManifestRoot(manifest.scope || scope, projectRoot);
  const anchor = installAnchor(manifest.scope || scope, projectRoot);
  const skills = manifest.selection?.length
    ? sourceSkills(packageRoot, resolveSkillSelection(packageRoot, manifest.selection))
    : listSourceSkills(packageRoot);
  const skillNames = skills.map((s) => s.name);
  let updated = 0;

  for (const dest of destinations) {
    const adapter = getAdapter(dest.adapter || "identity");
    const results = installTo(skills, dest.target, adapter, { force, dryRun, link: false, anchor });
    updated += results.filter((r) => r.status === "installed" || r.status === "linked").length;
  }

  if (!dryRun) {
    const next = destinations.map((d) => ({ ...d, skills: skillNames }));
    writeV2Manifest(manifestRoot, {
      scope: manifest.scope || scope,
      destinations: next,
      packageVersion: PKG.version,
      selection: manifest.selection || [],
    });
  }

  return { found: true, updated };
}

// ---------------------------------------------------------------------------
// Uninstall
// ---------------------------------------------------------------------------

export function uninstallProviders({ providerIds, scope, projectRoot, dryRun }) {
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const { manifest, destinations } = findInstalledDestinations(scope, projectRoot);
  if (!manifest) return { found: false };

  const ids = new Set(providerIds);
  const toRemove = destinations.filter((d) => ids.has(d.id));
  const removed = [];

  for (const dest of toRemove) {
    const anchor = dest.type === "custom" ? null : installAnchor(scope, projectRoot);
    for (const skillName of dest.skills || []) {
      const p = safeDestFor(dest.target, skillName, { warn: () => {}, anchor });
      if (!p) continue;
      if (fs.existsSync(p) && !dryRun) {
        fs.rmSync(p, { recursive: true, force: true });
      }
      removed.push({ id: dest.id, target: dest.target, skill: skillName });
    }
  }

  if (!dryRun) {
    const remaining = destinations.filter((d) => !ids.has(d.id));
    if (remaining.length > 0) {
      writeV2Manifest(manifestRoot, { scope, destinations: remaining, packageVersion: PKG.version });
    } else {
      removeManifest(manifestRoot);
    }
  }

  return { found: true, removed };
}

// ---------------------------------------------------------------------------
// List / Doctor
// ---------------------------------------------------------------------------

export function listInstallations(projectRoot) {
  const rows = [];
  const allProviders = [...getAllProviders(), UNIVERSAL];
  for (const provider of allProviders) {
    const projectTarget = resolveInstallTarget(provider, "project", projectRoot);
    const globalTarget = resolveInstallTarget(provider, "global", projectRoot);
    const scope = fs.existsSync(projectTarget) ? "project" : fs.existsSync(globalTarget) ? "global" : "none";
    const target = scope === "project" ? projectTarget : scope === "global" ? globalTarget : null;
    const installed = target && fs.existsSync(target)
      ? fs.readdirSync(target).filter((e) => fs.statSync(join(target, e)).isDirectory()).length
      : 0;
    rows.push({ provider: provider.name, scope, installed });
  }
  return rows;
}

export function doctorProviders(projectRoot, packageRoot) {
  const detected = detectProviders();
  const expected = listSourceSkills(packageRoot || resolveProjectRoot()).length;
  const rows = [];
  for (const provider of getAllProviders()) {
    const found = detected.includes(provider.id);
    const projectTarget = resolveInstallTarget(provider, "project", projectRoot);
    const globalTarget = resolveInstallTarget(provider, "global", projectRoot);
    const target = fs.existsSync(projectTarget) ? projectTarget : fs.existsSync(globalTarget) ? globalTarget : null;
    const installed = target && fs.existsSync(target)
      ? fs.readdirSync(target).filter((e) => fs.statSync(join(target, e)).isDirectory())
      : [];
    const missing = Math.max(0, expected - installed.length);
    rows.push({
      provider: provider.name,
      detected: found,
      installedCount: installed.length,
      missingCount: missing,
      target,
      healthy: missing === 0 && installed.length > 0,
    });
  }
  return rows;
}

export { UNIVERSAL };
