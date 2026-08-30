#!/usr/bin/env node
/**
 * ornn-forge — CLI
 *
 * Commands:
 *   install [options]   Interactive installer (default) or non-interactive
 *   validate            Run the repo validator
 *   update              Update previously installed skills
 *   uninstall           Remove managed skills
 *   doctor              Diagnose providers and installations
 *   list                List cataloged skills and installations
 *   graph [--out <f>]   Print a Mermaid graph
 *   eval [--json]       Run deterministic routing evals
 *
 * Zero runtime dependencies — Node >= 18 only.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const PKG = require("../package.json");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SKILLS_GLOB = join(ROOT, "skills");
const CATALOG = join(ROOT, "catalog", "skills.yaml");
const VALIDATOR = join(ROOT, "scripts", "validate.py");
const EVAL = join(ROOT, "scripts", "eval.py");

// ---------------------------------------------------------------------------
// Imports from the installer modules
// ---------------------------------------------------------------------------

import {
  getAllProviders,
  getProvider,
  detectProviders,
  evidenceFor,
} from "../src/installer/providers.js";

import {
  buildPlan,
  installProviders,
  updateProviders,
  uninstallProviders,
  listInstallations,
  doctorProviders,
  resolveInstallTarget,
  UNIVERSAL,
} from "../src/installer/orchestrator.js";

import { readManifest, manifestPath } from "../src/installer/manifest.js";
import { resolveProjectRoot, resolveManifestRoot } from "../src/installer/paths.js";
import { findSkillDirs, installTo, planInstall } from "../src/installer/install.js";

import { promptMultiSelect, promptConfirm, promptLine } from "../src/installer/prompts.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg = "") { try { process.stdout.write(msg + "\n"); } catch {} }
function err(msg) { try { process.stderr.write(msg + "\n"); } catch {} }

// ---------------------------------------------------------------------------
// HELP
// ---------------------------------------------------------------------------

const HELP = `ornn-forge v${PKG.version}

Modular Agent Skills that teach coding agents to audit systems, find bugs,
review UX/frontend, and research before reinventing.

Usage:
  ornn-forge install [options]   Interactive installer
  ornn-forge update              Update managed skills
  ornn-forge uninstall           Remove managed skills
  ornn-forge validate            Run the repo validator
  ornn-forge doctor              Diagnose providers and installs
  ornn-forge list                List cataloged skills
  ornn-forge graph [--out <f>]   Print a Mermaid graph
  ornn-forge eval [--json]       Run deterministic routing evals
  ornn-forge --help              Show this help
  ornn-forge --version           Show version

Options (install/update/uninstall):
  --scope <scope>       project | global (default: project)
  --providers <list>    comma-separated profile ids, "detected", "all"
  --universal           Install to .agents/skills (no provider adapter)
  --destination <dir>   Install to a custom directory
  --yes / -y            Skip confirmation
  --dry-run             Preview without writing
  --force               Overwrite existing skills
  --link                Create symlinks instead of copying
  --target <dir>        Legacy: single-target install (use --destination instead)

Short aliases:
  -g  --scope global
  -y  --yes
  -a  --providers
`;

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function runPython(script, args, { inherit = true } = {}) {
  if (!fs.existsSync(script)) {
    err(`Script not found: ${script}`);
    process.exitCode = 1;
    return false;
  }
  const r = spawnSync("python3", [script, ...args], {
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8",
  });
  if (r.error) { err(`Failed to run python3: ${r.error.message}`); process.exitCode = 1; return false; }
  if (r.status !== 0) process.exitCode = r.status;
  return r.status === 0;
}

function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

function parseCatalogForList() {
  const text = fs.readFileSync(CATALOG, "utf8");
  const skills = [];
  let current = null;
  let listKey = null;
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;
    if (trimmed.startsWith("- ")) {
      const m = trimmed.slice(2).match(/^(\w+):\s*(.*)$/);
      if (m) {
        if (current) skills.push(current);
        current = { [m[1]]: m[2] };
        listKey = null;
        continue;
      }
      if (current && listKey) { current[listKey] = (current[listKey] || []).concat(trimmed.slice(2)); }
      continue;
    }
    if (current && trimmed.includes(":")) {
      const m = trimmed.match(/^(\w+):\s*(.*)$/);
      if (m) {
        if (m[2]) { current[m[1]] = m[2]; listKey = null; }
        else { current[m[1]] = []; listKey = m[1]; }
      }
    }
  }
  if (current) skills.push(current);
  return skills.filter((s) => s.name);
}

// ---------------------------------------------------------------------------
// Custom provider helper
// ---------------------------------------------------------------------------

function customProvider(path) {
  const abs = resolve(path);
  return {
    id: "custom",
    name: `Custom directory (${abs})`,
    type: "custom",
    projectPath: abs,
    globalPath: abs,
    adapterName: "identity",
    adapter: (c) => c,
  };
}

// ---------------------------------------------------------------------------
// resolveProviders: resolve a list of provider ids from CLI flags
// ---------------------------------------------------------------------------

function resolveProviders(ids, projectRoot) {
  if (ids === "detected") {
    const detected = detectProviders();
    return detected.map((id) => getProvider(id)).filter(Boolean);
  }
  if (ids === "all") {
    return getAllProviders();
  }
  const list = ids.split(",").map((s) => s.trim()).filter(Boolean);
  return list.map((id) => {
    const p = getProvider(id);
    if (!p) {
      err(`Unknown provider: ${id}. Valid: ${getAllProviders().map((x) => x.id).join(", ")}`);
      process.exitCode = 1;
    }
    return p;
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Interactive install
// ---------------------------------------------------------------------------

async function interactiveInstall(projectRoot, packageRoot) {
  const allProviders = getAllProviders();

  log(`\nAgent Engineering Skills v${PKG.version}\n`);

  // Scope
  log("Where do you want to install?");
  log("  ● Current project");
  log("  ○ Globally");
  const scopeChoice = await promptLine({ prompt: "Scope:", default: "project" });
  const scope = scopeChoice === "global" ? "global" : "project";

  // Build multi-select items with evidence
  const items = [];
  let hasEvidence = false;

  for (const p of allProviders) {
    const target = resolveInstallTarget(p, scope, projectRoot);
    const ev = evidenceFor(p, scope, projectRoot);
    const evIcon = ev === "configured" ? "✓" : ev === "command found" ? "!" : "○";
    items.push({
      id: p.id,
      label: `${p.name} — ${target} (${evIcon} ${ev})`,
      checked: ev === "configured" || ev === "command found",
    });
    if (ev === "configured") hasEvidence = true;
  }

  // Universal always available
  const universalTarget = resolveInstallTarget(UNIVERSAL, scope, projectRoot);
  items.push({
    id: "universal",
    label: `Universal Agent Skills — ${universalTarget} (always available)`,
    checked: !hasEvidence,
  });

  // Custom directory option
  items.push({
    id: "custom",
    label: "Custom directory (enter a path)",
    checked: false,
  });

  const selectedIds = await promptMultiSelect({
    title: "Select destinations:",
    items,
  });

  if (selectedIds.length === 0) {
    log("No destinations selected. Nothing to install.");
    return;
  }

  // Build provider list
  const selectedProviders = [];
  for (const id of selectedIds) {
    if (id === "universal") {
      selectedProviders.push(UNIVERSAL);
    } else if (id === "custom") {
      const customPath = await promptLine({ prompt: "Custom install path:", default: join(projectRoot, ".custom-skills") });
      selectedProviders.push(customProvider(customPath));
    } else {
      const p = getProvider(id);
      if (p) selectedProviders.push(p);
    }
  }

  if (selectedProviders.length === 0) {
    log("No providers selected. Nothing to install.");
    return;
  }

  // Build plan
  const plan = buildPlan({
    providers: selectedProviders,
    scope,
    projectRoot,
    packageRoot,
    force: false,
  });

  log("\nInstallation plan");
  log(`\nScope: ${scope === "global" ? "Global" : "Current project"}`);
  if (scope === "project") log(`Project: ${projectRoot}`);
  log(`\nDestinations: ${plan.skills.length} skills`);
  for (const p of plan.plans) {
    log(`  ${p.provider.name}: ${p.target}`);
    log(`    Will install: ${p.wouldInstall}`);
    if (p.wouldSkip > 0) log(`    Will skip: ${p.wouldSkip}`);
  }

  const confirmed = await promptConfirm({ prompt: "Continue?", defaultAnswer: "y" });
  if (!confirmed) {
    log("Cancelled.");
    return;
  }

  // Execute
  const result = installProviders({
    providers: selectedProviders,
    scope,
    projectRoot,
    packageRoot,
    force: false,
    dryRun: false,
    link: false,
  });

  log("\nInstalling Agent Engineering Skills");
  let errored = 0;
  for (const s of result.summary) {
    errored += s.errored || 0;
    log(`✓ ${s.provider.name.padEnd(20)} ${s.target}  ${s.installed} skills`);
  }
  if (errored > 0) {
    err(`\n${errored} skill installation(s) refused (path safety / symlink escape).`);
    process.exitCode = 1;
    return;
  }
  log(`\nDone. ${result.summary.length} destination(s) configured.`);
}

// ---------------------------------------------------------------------------
// Non-interactive install
// ---------------------------------------------------------------------------

function nonInteractiveInstall(opts, projectRoot, packageRoot) {
  if (opts.universal) {
    const provider = UNIVERSAL;
    const result = installProviders({
      providers: [provider],
      scope: opts.scope,
      projectRoot,
      packageRoot,
      force: opts.force,
      dryRun: opts.dryRun,
      link: opts.link,
    });
    if (opts.dryRun) {
      log(`would install: ${result.skills.length} skills`);
      log(`target: ${result.summary[0]?.target}`);
      return;
    }
    log(`Installed ${result.summary[0]?.installed} skills to ${result.summary[0]?.target}`);
    if ((result.summary[0]?.errored || 0) > 0) {
      err(`\n${result.summary[0].errored} skill installation(s) refused (path safety / symlink escape).`);
      process.exitCode = 1;
    }
    return;
  }

  if (opts.legacyTarget) {
    // Legacy single-target mode (preserve backwards compatibility)
    const { runInstall } = requireForLegacy();
    runInstall(opts.legacyTarget, { link: opts.link, force: opts.force, dryRun: opts.dryRun });
    return;
  }

  // With --destination but no explicit --providers, install only to that
  // destination. An explicit --providers combines with the destination.
  let providers = [];
  if (opts.destination && !opts.providersExplicit) {
    providers = [customProvider(opts.destination)];
  } else {
    providers = resolveProviders(opts.providers, projectRoot);
    if (opts.destination) providers.push(customProvider(opts.destination));
  }
  if (providers.length === 0) {
    err("No valid providers. Use --providers, --universal, or --destination.");
    process.exitCode = 1;
    return;
  }

  if (opts.dryRun) {
    const plan = buildPlan({ providers, scope: opts.scope, projectRoot, packageRoot, force: opts.force });
    log("Installation plan (dry-run)");
    if (opts.scope === "project") log(`Project: ${projectRoot}`);
    for (const p of plan.plans) {
      log(`  ${p.provider.name}: ${p.target} — ${p.wouldInstall} to install, ${p.wouldSkip} skip`);
    }
    return;
  }

  const result = installProviders({
    providers,
    scope: opts.scope,
    projectRoot,
    packageRoot,
    force: opts.force,
    dryRun: false,
    link: opts.link,
  });
  let errored = 0;
  for (const s of result.summary) {
    errored += s.errored || 0;
    log(`✓ ${s.provider.name}: ${s.installed} skills → ${s.target}`);
  }
  if (errored > 0) {
    err(`\n${errored} skill installation(s) refused (path safety / symlink escape).`);
    process.exitCode = 1;
  }
}

function requireForLegacy() {
  // Preserve the original runInstall for backward compat with --target.
  const runInstall = (target, { link, force, dryRun }) => {
    const skills = findSkillDirs(join(ROOT, "skills"));
    if (!skills.length) { err("No skills found"); process.exitCode = 1; return; }
    const targetAbs = resolve(target);
    if (dryRun) {
      const plan = planInstall(skills, targetAbs, { force });
      log(`would install: ${plan.wouldInstall}`);
      log(`would overwrite: ${plan.wouldOverwrite}`);
      log(`would skip: ${plan.wouldSkip}`);
      return;
    }
    fs.mkdirSync(targetAbs, { recursive: true });
    const claudeAdapter = (content) => {
      const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) return content;
      const fm = m[1]; const body = content.slice(m[0].length);
      const get = (key) => { const re = new RegExp(`^${key}:\\s*(.+)$`, "m"); const hit = fm.match(re); return hit ? hit[1].trim().replace(/^['"]|['"]$/g, "") : null; };
      const name = get("name"); const description = get("description");
      if (!name || !description) return content;
      return `---\nname: ${name}\ndescription: ${description}\nuser_invocable: true\n---\n${body}`;
    };
    const results = installTo(skills, targetAbs, claudeAdapter, { force, dryRun, link });
    const counts = { installed: 0, linked: 0, skipped: 0, errors: 0 };
    for (const r of results) {
      if (r.status === "error") { counts.errors++; err(`  ✗ ${r.name}`); }
      else if (r.status === "linked") { counts.linked++; log(`  ✓ ${r.name} — linked`); }
      else if (r.status === "skipped") { counts.skipped++; log(`  • ${r.name} — skipped`); }
      else { counts.installed++; log(`  ✓ ${r.name} — installed`); }
    }
    log(`\nDone: ${counts.installed} installed, ${counts.linked} linked, ${counts.skipped} skipped.`);
    if (counts.errors) process.exitCode = 1;
  };
  return { runInstall };
}

// ---------------------------------------------------------------------------
// non-promise commands
// ---------------------------------------------------------------------------

function runValidate() { runPython(VALIDATOR, []); }
function runEval(json) { runPython(EVAL, ["route", "--router", "v2", json ? "--json" : "--check"]); }

function runGraph(outFile) {
  if (!fs.existsSync(CATALOG)) { err("catalog/skills.yaml not found"); process.exitCode = 1; return; }
  const skills = parseCatalogForList();
  const lines = ["```mermaid", "graph TD"];
  for (const s of skills) {
    const partners = s.composes_with || [];
    const name = s.name || "";
    for (const partner of Array.isArray(partners) ? partners : [partners].filter(Boolean)) {
      if (partner) lines.push(`    ${name}[${name}] --> ${partner}[${partner}]`);
    }
  }
  lines.push("```");
  const output = lines.join("\n") + "\n";
  if (outFile) { fs.writeFileSync(resolve(outFile), output); log(`graph written to ${outFile}`); }
  else { process.stdout.write(output); }
}

function runListInstallations(projectRoot, opts) {
  const catalog = parseCatalogForList();
  const rows = listInstallations(projectRoot);
  log("name                      category      role            priority  installed");
  for (const s of catalog) {
    const mark = rows.find((r) => r.installed > 0) ? "yes" : "no";
    log(`${(s.name || "").padEnd(26)} ${(s.category || "").padEnd(13)} ${(s.role || "").padEnd(15)} ${(s.priority || "").padEnd(9)} ${mark}`);
  }
  log("");
  log("Provider        Scope       Installed");
  for (const r of rows) {
    log(`${r.provider.padEnd(16)} ${r.scope.padEnd(11)} ${r.installed}`);
  }
}

function runDoctor(projectRoot, packageRoot) {
  const detected = detectProviders();
  const detectedSet = new Set(detected);
  log(`\nAgent Engineering Skills doctor v${PKG.version}\n`);
  log("Node version: " + process.versions.node);
  log("Project: " + projectRoot);
  log("");
  for (const p of getAllProviders()) {
    log(`  ${detectedSet.has(p.id) ? "✓" : "○"} ${p.name} ${detectedSet.has(p.id) ? "detected" : "not detected"}`);
  }
  log("");
  const rows = doctorProviders(projectRoot, packageRoot);
  log("Installations:");
  for (const r of rows) {
    const status = r.healthy ? "✓" : r.installedCount > 0 ? "!" : "○";
    log(`  ${status} ${r.provider}`);
    if (r.target) log(`    ${r.target}`);
    log(`    ${r.installedCount} skills${r.missingCount > 0 ? ` (${r.missingCount} missing)` : " (healthy)"}`);
  }
  // Doctor reports; it does not fail just because a provider is not installed.
  // A non-zero exit is reserved for actual errors (missing catalog, etc.).
  if (process.exitCode === 0 && !fs.existsSync(CATALOG)) {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    command: null,
    scope: "project",
    providers: "detected",
    providersExplicit: false,
    universal: false,
    yes: false,
    dryRun: false,
    force: false,
    link: false,
    legacyTarget: null,
    destination: null,
    out: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { log(HELP); process.exit(0); }
    else if (a === "--version" || a === "-v") { log(PKG.version); process.exit(0); }
    else if (a === "--scope" || a === "-g") {
      if (a === "-g") opts.scope = "global";
      else opts.scope = argv[++i] || "project";
    }
    else if (a === "--providers" || a === "-a") { opts.providers = argv[++i] || "detected"; opts.providersExplicit = true; }
    else if (a === "--universal") { opts.universal = true; }
    else if (a === "--destination") { opts.destination = argv[++i] || null; }
    else if (a === "--yes" || a === "-y") { opts.yes = true; }
    else if (a === "--dry-run") { opts.dryRun = true; }
    else if (a === "--force") { opts.force = true; }
    else if (a === "--link") { opts.link = true; }
    else if (a === "--target") { opts.legacyTarget = resolve(argv[++i] || ""); }
    else if (a === "--out") { opts.out = argv[++i] || null; }
    else if (a === "--json") { opts.json = true; }
    else if (a.startsWith("-")) { err(`Unknown option: ${a}\n`); log(HELP); process.exitCode = 1; return null; }
    else if (!opts.command) { opts.command = a; }
    else { err(`Unknown option: ${a}`); process.exitCode = 1; return null; }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) return;
  const command = opts.command || "install";
  const projectRoot = resolveProjectRoot();

  switch (command) {
    case "install": {
      if (opts.yes || opts.legacyTarget || opts.destination || opts.providers !== "detected" || !isInteractive()) {
        if (opts.legacyTarget) {
          const { runInstall } = requireForLegacy();
          runInstall(opts.legacyTarget, { link: opts.link, force: opts.force, dryRun: opts.dryRun });
        } else {
          nonInteractiveInstall(opts, projectRoot, ROOT);
        }
      } else {
        await interactiveInstall(projectRoot, ROOT);
      }
      break;
    }
    case "update": {
      const { found, updated } = updateProviders({ scope: opts.scope, projectRoot, packageRoot: ROOT, force: opts.force, dryRun: opts.dryRun });
      if (!found) { log("No installation manifest found. Run install first."); process.exitCode = 1; break; }
      if (opts.dryRun) { log(`Would update managed skills (${updated} refreshed).`); break; }
      log(`Updated. ${updated} skills refreshed.`);
      break;
    }
    case "uninstall": {
      const providers = opts.providers === "detected" ? detectProviders() : opts.providers.split(",").map((s) => s.trim()).filter(Boolean);
      if (providers.length === 0) { err("No providers to uninstall."); process.exitCode = 1; break; }
      if (!opts.yes && isInteractive()) {
        log("\nRemove Agent Engineering Skills from:");
        for (const id of providers) log(`  ☑ ${id}`);
        const confirmed = await promptConfirm({ prompt: "Continue?", defaultAnswer: "n" });
        if (!confirmed) { log("Cancelled."); break; }
      }
      const result = uninstallProviders({ providerIds: providers, scope: opts.scope, projectRoot, dryRun: opts.dryRun });
      if (opts.dryRun) { log(`Would remove ${result.removed?.length || 0} managed skills.`); break; }
      log(`Removed ${result.removed?.length || 0} managed skills.`);
      break;
    }
    case "validate": runValidate(); break;
    case "doctor": runDoctor(projectRoot, ROOT); break;
    case "list": runListInstallations(projectRoot, opts); break;
    case "graph": runGraph(opts.out); break;
    case "eval": runEval(opts.json); break;
    default:
      err(`Unknown command: ${command}\n`);
      log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  err(`Error: ${e.message}`);
  process.exitCode = 1;
});