/**
 * orchestrator.js — install/update/uninstall/list/doctor orchestration
 *
 * The CLI calls this layer; the layer owns the provider resolution, scope,
 * manifest lifecycle, and safety validation. Never touches the source skills.
 */

import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { getAllProviders, getProvider, detectProviders, resolveTarget } from "./providers.js";
import { findSkillDirs, installTo, planInstall, writeInstallManifest } from "./install.js";
import { readManifest, writeManifest, manifestPath, removeManifest } from "./manifest.js";
import { resolveProjectRoot, resolveManifestRoot, safeDestFor } from "./paths.js";

const require = createRequire(import.meta.url);
const PKG = require("../../package.json");

const UNIVERSAL = {
  id: "universal",
  name: "Universal .agents/skills",
  projectPath: ".agents/skills",
  globalPath: join(os.homedir(), ".agents", "skills"),
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
 * Plan an installation for a set of providers.
 * Returns a structured plan (no writes).
 */
export function buildPlan({ providers, scope, projectRoot, packageRoot, force }) {
  const skills = listSourceSkills(packageRoot);
  const anchor = installAnchor(scope, projectRoot);
  const plans = [];
  for (const provider of providers) {
    const target = resolveInstallTarget(provider, scope, projectRoot);
    const plan = planInstall(skills, target, { force, anchor });
    plans.push({ provider, target, ...plan });
  }
  return { skills, plans };
}

/**
 * Execute an installation. Returns a summary.
 */
export function installProviders({ providers, scope, projectRoot, packageRoot, force, dryRun, link }) {
  const { skills, plans } = buildPlan({ providers, scope, projectRoot, packageRoot, force });
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const anchor = installAnchor(scope, projectRoot);
  const providerIds = providers.map((p) => p.id);
  const skillNames = skills.map((s) => s.name);
  const summary = [];

  for (const plan of plans) {
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

  if (!dryRun) {
    writeInstallManifest(manifestRoot, providerIds, skillNames, PKG.version);
  }

  return { skills, summary, manifestRoot };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function findInstalledProviders(scope, projectRoot) {
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const manifest = readManifest(manifestRoot);
  if (!manifest || !Array.isArray(manifest.providers)) return { manifest, providers: [] };
  const providers = manifest.providers
    .map((id) => (id === "universal" ? UNIVERSAL : getProvider(id)))
    .filter(Boolean);
  return { manifest, providers };
}

export function updateProviders({ scope, projectRoot, packageRoot, force, dryRun }) {
  const { manifest, providers } = findInstalledProviders(scope, projectRoot);
  if (!manifest) {
    return { found: false };
  }
  const result = installProviders({
    providers,
    scope: manifest.scope || scope,
    projectRoot,
    packageRoot,
    force,
    dryRun,
    link: false,
  });
  return { found: true, ...result };
}

// ---------------------------------------------------------------------------
// Uninstall
// ---------------------------------------------------------------------------

export function uninstallProviders({ providerIds, scope, projectRoot, dryRun }) {
  const manifestRoot = resolveManifestRoot(scope, projectRoot);
  const manifest = readManifest(manifestRoot);
  if (!manifest) {
    return { found: false };
  }
  const targets = providerIds.map((id) => {
    const provider = id === "universal" ? UNIVERSAL : getProvider(id);
    return { id, provider, target: resolveInstallTarget(provider, scope, projectRoot) };
  });
  const removed = [];
  const anchor = installAnchor(scope, projectRoot);
  for (const { id, target } of targets) {
    for (const skillName of manifest.skills || []) {
      const dest = safeDestFor(target, skillName, { warn: () => {}, anchor });
      if (!dest) continue;
      if (fs.existsSync(dest) && !dryRun) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      removed.push({ provider: id, skill: skillName });
    }
  }
  if (!dryRun) {
    // Remove the manifest only when no managed skills remain under it.
    if (manifest.skills && manifest.skills.length > 0) {
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

export function doctorProviders(projectRoot) {
  const detected = detectProviders();
  const rows = [];
  for (const provider of getAllProviders()) {
    const found = detected.includes(provider.id);
    const projectTarget = resolveInstallTarget(provider, "project", projectRoot);
    const globalTarget = resolveInstallTarget(provider, "global", projectRoot);
    const target = fs.existsSync(projectTarget) ? projectTarget : fs.existsSync(globalTarget) ? globalTarget : null;
    const installed = target && fs.existsSync(target)
      ? fs.readdirSync(target).filter((e) => fs.statSync(join(target, e)).isDirectory())
      : [];
    const missing = installed.length < 25 ? 25 - installed.length : 0;
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
