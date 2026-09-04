#!/usr/bin/env node
/**
 * Ornn — portable knowledge library CLI
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
import { distributionSkills, loadLibrary, resolveItem, resolveSkillSelection, searchLibrary, sourceSkills } from "../src/library/catalog.js";
import { buildDistributions } from "../src/library/build.js";
import { planKnowledge } from "../src/library/gateway.js";

import { promptMultiSelect, promptSelect, promptConfirm, promptLine } from "../src/installer/prompts.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg = "") { try { process.stdout.write(msg + "\n"); } catch {} }
function err(msg) { try { process.stderr.write(msg + "\n"); } catch {} }

// ---------------------------------------------------------------------------
// HELP
// ---------------------------------------------------------------------------

const HELP = `ornn v${PKG.version}

Portable knowledge discovery for AI coding agents. After installation, use:
  /ornn <what you want to accomplish>

Usage:
  ornn list [type]                  List library content
  ornn search <query>               Search all canonical knowledge
  ornn discover <request>           Preview the /ornn knowledge plan
  ornn show <name>                  Show metadata and canonical content
  ornn install [item ...]           Install the Ornn gateway (or a selection)
  ornn init                         Detect providers and suggest collections
  ornn update                       Refresh managed skills
  ornn build [--providers <list>]   Generate gateway-first dist/ from canonical source
  ornn detect [path] [--json]       Run deterministic detectors without an LLM
  ornn pin <command>                Save an intent shortcut for project discovery
  ornn doctor                       Diagnose provider integrations
  ornn validate                     Validate canonical content

Options (install/update/uninstall):
  --scope <scope>       project | global (default: project)
  --providers <list>    comma-separated profile ids, "detected", "all"
  --universal           Install to .agents/skills (no provider adapter)
  --destination <dir>   Install to a custom directory
  --yes / -y            Skip confirmation
  --dry-run             Preview without writing
  --force               Overwrite existing skills
  --link                Create symlinks instead of copying
  --profile <profile>   gateway (default) | full
  --target <dir>        Legacy: single-target install (use --destination instead)

Short aliases:
  -g  --scope global
  -y  --yes
  -a  --providers

Compatibility commands: graph, eval, uninstall. They are optional tooling, not an
execution runtime.
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

  log(`\nOrnn skill library v${PKG.version}\n`);

  // Scope
  const scopeChoice = await promptSelect({
    title: "Where do you want to install?",
    items: [
      { id: "project", label: "Current project" },
      { id: "global", label: "Globally" },
    ],
    defaultIndex: 0,
  });
  if (scopeChoice === null) { log("Cancelled."); return; }
  const scope = scopeChoice;

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

  if (selectedIds === null) { log("Cancelled."); return; }

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
      if (customPath === null) { log("Cancelled."); return; }
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
    profile: "gateway",
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
    profile: "gateway",
  });

  log("\nInstalling Ornn skills");
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
  let selected;
  try {
    const selectedIds = opts.positionals.length ? resolveSkillSelection(ROOT, opts.positionals) : [];
    selected = distributionSkills(ROOT, { profile: opts.profile, selectedIds });
  } catch (error) {
    err(error.message); process.exitCode = 1; return;
  }
  if (opts.link && opts.profile === "gateway" && opts.positionals.length === 0) {
    err("Gateway profile cannot be symlinked because its private payload is generated. Use copy mode or --profile full.");
    process.exitCode = 1;
    return;
  }
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
      skills: selected,
      selection: opts.positionals,
      profile: opts.positionals.length ? "full" : opts.profile,
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
    const plan = buildPlan({ providers, scope: opts.scope, projectRoot, packageRoot, force: opts.force, skills: selected, profile: opts.profile });
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
    skills: selected,
    selection: opts.positionals,
    profile: opts.positionals.length ? "full" : opts.profile,
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
  const requestedType = opts.positionals[0]?.replace(/s$/, "") || null;
  const library = loadLibrary(ROOT).filter((item) => !requestedType || item.type === requestedType);
  const rows = listInstallations(projectRoot);
  log("TYPE         NAME                                      VERSION  installed");
  for (const item of library) {
    log(`${item.type.toUpperCase().padEnd(12)} ${item.id.padEnd(41)} ${item.version}`);
  }
  log("");
  log("Provider        Scope       Installed");
  for (const r of rows) {
    log(`${r.provider.padEnd(16)} ${r.scope.padEnd(11)} ${r.installed}`);
  }
}

function runSearch(opts) {
  const query = opts.positionals.join(" ").trim();
  if (!query) { err("Usage: ornn search <query>"); process.exitCode = 1; return; }
  const results = searchLibrary(ROOT, query);
  if (!results.length) { log(`No Ornn knowledge found for "${query}".`); return; }
  for (const type of ["skill", "pattern", "collection", "recipe", "command"]) {
    const group = results.filter((item) => item.type === type);
    if (!group.length) continue;
    log(`\n${type.toUpperCase()}S`);
    for (const item of group) log(`  ${item.id}${item.description ? ` — ${item.description}` : ""}`);
  }
}

function runShow(opts) {
  const name = opts.positionals[0];
  if (!name) { err("Usage: ornn show <name>"); process.exitCode = 1; return; }
  const item = resolveItem(ROOT, name);
  if (!item) { err(`No unique library item found: ${name}`); process.exitCode = 1; return; }
  log(`TYPE: ${item.type.toUpperCase()}`);
  log(`NAME: ${item.id}`);
  log(`VERSION: ${item.version}`);
  log(`SOURCE: ${item.path}`);
  log("");
  process.stdout.write(item.content.endsWith("\n") ? item.content : item.content + "\n");
}

function runDiscover(opts, projectRoot) {
  const request = opts.positionals.join(" ").trim();
  if (!request) { err("Usage: ornn discover <request> [--debug] [--json]"); process.exitCode = 1; return; }
  const plan = planKnowledge(ROOT, request, { projectRoot });
  if (opts.json) { log(JSON.stringify(opts.debug ? plan : { intent: plan.intent, knowledge: plan.knowledge, strategy: plan.strategy, project: plan.project }, null, 2)); return; }
  log(`Intent: ${plan.intent.task}`);
  log(`Selected: ${[...plan.knowledge.primary, ...plan.knowledge.supporting].join(", ") || "none"}`);
  log(`References: ${plan.knowledge.references.join(", ") || "none"}`);
  log("Execution: consuming agent");
  if (opts.debug) {
    log("\nCandidates:");
    for (const candidate of plan.debug.candidates) log(`  ${candidate.name.padEnd(28)} ${candidate.score.toFixed(3)}  ${(candidate.reasons || []).join("; ")}`);
    log("\nLoaded by plan:");
    for (const artifact of plan.artifacts) log(`  ${artifact.type}:${artifact.id} → ${artifact.path}`);
  }
}

function runBuild(opts) {
  const providers = opts.providersExplicit ? opts.providers.split(",").map((value) => value.trim()).filter(Boolean) : undefined;
  for (const row of buildDistributions(ROOT, { providers, profile: opts.profile })) log(`Built ${row.provider} (${opts.profile}): ${row.skills} skills → ${row.path}`);
}

function runDetect(opts) {
  const args = [join(ROOT, "detectors", "run.js"), opts.positionals[0] || process.cwd()];
  if (opts.json) args.push("--json");
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  process.exitCode = result.status || 0;
}

function runPin(opts, projectRoot) {
  const name = opts.positionals[0];
  const item = name ? resolveItem(ROOT, `command:${name}`) : null;
  if (!item || item.type !== "command") { err("Usage: ornn pin <command>"); process.exitCode = 1; return; }
  const directory = join(projectRoot, ".ornn");
  const path = join(directory, "pins.json");
  let data = { version: 1, commands: [] };
  try { data = JSON.parse(fs.readFileSync(path, "utf8")); } catch {}
  data.commands = [...new Set([...(data.commands || []), item.id])].sort();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  log(`Pinned ${item.id} for discovery in ${path}. This does not execute the command.`);
}

function detectProjectCollections(projectRoot) {
  const suggestions = new Set();
  let packageText = "";
  try { packageText = fs.readFileSync(join(projectRoot, "package.json"), "utf8"); } catch {}
  if (/react|next|vite|tailwind/i.test(packageText)) {
    suggestions.add("frontend-craft"); suggestions.add("accessibility");
  }
  if (/react/i.test(packageText)) suggestions.add("react");
  if (/motion|framer-motion/i.test(packageText)) suggestions.add("motion");
  return [...suggestions];
}

async function runInit(opts, projectRoot) {
  const detected = detectProviders();
  const suggestions = detectProjectCollections(projectRoot);
  log("Ornn initialization plan");
  log(`Project: ${projectRoot}`);
  log(`Providers detected: ${detected.join(", ") || "none (generic is always available)"}`);
  log(`Suggested collections: ${suggestions.join(", ") || "none; search or install the full library"}`);
  log(`PRODUCT.md: ${fs.existsSync(join(projectRoot, "PRODUCT.md")) ? "found" : "optional, not found"}`);
  log(`DESIGN.md: ${fs.existsSync(join(projectRoot, "DESIGN.md")) ? "found" : "optional, not found"}`);
  if (!opts.yes) { log("Run `ornn install <collection...> --providers <list>` to apply this recommendation."); return; }
  const providerIds = opts.providersExplicit ? opts.providers : (detected.length ? detected.join(",") : "generic");
  const installOpts = { ...opts, providers: providerIds, providersExplicit: true, positionals: [], profile: "gateway" };
  if (providerIds === "generic") installOpts.universal = true;
  nonInteractiveInstall(installOpts, projectRoot, ROOT);
}

function runDoctor(projectRoot, packageRoot) {
  const detected = detectProviders();
  const detectedSet = new Set(detected);
  log(`\nOrnn integration doctor v${PKG.version}\n`);
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
    debug: false,
    profile: "gateway",
    positionals: [],
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
    else if (a.startsWith("--providers=")) { opts.providers = a.slice("--providers=".length); opts.providersExplicit = true; }
    else if (a.startsWith("--scope=")) { opts.scope = a.slice("--scope=".length); }
    else if (a === "--universal") { opts.universal = true; }
    else if (a === "--destination") { opts.destination = argv[++i] || null; }
    else if (a === "--yes" || a === "-y") { opts.yes = true; }
    else if (a === "--dry-run") { opts.dryRun = true; }
    else if (a === "--force") { opts.force = true; }
    else if (a === "--link") { opts.link = true; }
    else if (a === "--profile") { opts.profile = argv[++i] || "gateway"; }
    else if (a.startsWith("--profile=")) { opts.profile = a.slice("--profile=".length); }
    else if (a === "--target") { opts.legacyTarget = resolve(argv[++i] || ""); }
    else if (a === "--out") { opts.out = argv[++i] || null; }
    else if (a === "--json") { opts.json = true; }
    else if (a === "--debug") { opts.debug = true; }
    else if (a.startsWith("-")) { err(`Unknown option: ${a}\n`); log(HELP); process.exitCode = 1; return null; }
    else if (!opts.command) { opts.command = a; }
    else { opts.positionals.push(a); }
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
      const shorthand = opts.positionals.length === 1 && (getProvider(opts.positionals[0]) || opts.positionals[0] === "generic");
      if (shorthand) {
        const provider = opts.positionals[0];
        opts.positionals = [];
        if (provider === "generic") opts.universal = true;
        else { opts.providers = provider; opts.providersExplicit = true; }
      }
      if (opts.yes || opts.positionals.length || opts.legacyTarget || opts.destination || opts.providers !== "detected" || !isInteractive()) {
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
    case "init": await runInit(opts, projectRoot); break;
    case "search": runSearch(opts); break;
    case "discover": runDiscover(opts, projectRoot); break;
    case "show": runShow(opts); break;
    case "build": runBuild(opts); break;
    case "detect": runDetect(opts); break;
    case "pin": runPin(opts, projectRoot); break;
    case "update": {
      const { found, updated } = updateProviders({ scope: opts.scope, projectRoot, packageRoot: ROOT, force: opts.force, dryRun: opts.dryRun });
      if (!found) { log("No installation manifest found. Run install first."); process.exitCode = 1; break; }
      if (opts.dryRun) { log(`Would update managed skills (${updated} refreshed).`); break; }
      log(`Updated. ${updated} managed skills refreshed; existing local files were preserved unless --force was used.`);
      break;
    }
    case "uninstall": {
      const providers = opts.providers === "detected" ? detectProviders() : opts.providers.split(",").map((s) => s.trim()).filter(Boolean);
      if (providers.length === 0) { err("No providers to uninstall."); process.exitCode = 1; break; }
      if (!opts.yes && isInteractive()) {
        log("\nRemove managed Ornn skills from:");
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

main().then(() => {
  process.exit(process.exitCode || 0);
}).catch((e) => {
  err(`Error: ${e.message}`);
  process.exit(1);
});
