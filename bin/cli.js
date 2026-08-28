#!/usr/bin/env node
/**
 * agent-engineering-skills — CLI
 *
 * Commands:
 *   install [--target <dir>] [--link] [--force] [--dry-run]
 *   validate
 *   doctor
 *   list
 *   graph [--out <file>]
 *   eval [--json]
 *
 * Zero runtime dependencies — Node >= 18 only.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const PKG = require("../package.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKILLS_GLOB = path.join(ROOT, "skills");
const CATALOG = path.join(ROOT, "catalog", "skills.yaml");
const DEFAULT_TARGET = path.join(os.homedir(), ".claude", "skills");
const VALIDATOR = path.join(ROOT, "scripts", "validate.py");
const EVAL = path.join(ROOT, "scripts", "eval.py");

const HELP = `agent-engineering-skills v${PKG.version}

Modular Agent Skills that teach coding agents to audit systems, find bugs,
review UX/frontend, and research before reinventing.

Usage:
  agent-engineering-skills install [options]   Install the skills into a
                                               Claude Code skills directory
  agent-engineering-skills validate            Run the repo validator
  agent-engineering-skills doctor              Diagnose the repo and install
  agent-engineering-skills list                List cataloged skills
  agent-engineering-skills graph [--out <f>]   Print a Mermaid graph
  agent-engineering-skills eval [--json]       Run deterministic routing evals
  agent-engineering-skills --help              Show this help
  agent-engineering-skills --version           Show version

Options (install):
  --target <dir>   Destination skills directory (default: ~/.claude/skills)
  --link           Create symlinks instead of copying
  --force          Overwrite existing skills with the same name
  --dry-run        Print what would happen; make no filesystem changes
`;

function log(msg = "") {
  try { process.stdout.write(msg + "\n"); } catch { /* ignore EPIPE */ }
}
function err(msg) {
  try { process.stderr.write(msg + "\n"); } catch { /* ignore EPIPE */ }
}

/** List every <category>/<skill>/ directory under skills/. */
function findSkillDirs() {
  const dirs = [];
  if (!fs.existsSync(SKILLS_GLOB)) return dirs;
  for (const category of fs.readdirSync(SKILLS_GLOB)) {
    const catPath = path.join(SKILLS_GLOB, category);
    let stat;
    try {
      stat = fs.statSync(catPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const skill of fs.readdirSync(catPath)) {
      const skillPath = path.join(catPath, skill);
      let s;
      try {
        s = fs.statSync(skillPath);
      } catch {
        continue;
      }
      if (!s.isDirectory()) continue;
      if (!fs.existsSync(path.join(skillPath, "SKILL.md"))) continue;
      dirs.push({ category, name: skill, src: skillPath });
    }
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

/** Rewrite frontmatter into Claude Code's native shape. */
function adaptFrontmatter(original) {
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return original;
  const fm = m[1];
  const body = original.slice(m[0].length);
  const get = (key) => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
    const hit = fm.match(re);
    return hit ? hit[1].trim().replace(/^['"]|['"]$/g, "") : null;
  };
  const name = get("name");
  const description = get("description");
  if (!name || !description) return original;
  return `---\nname: ${name}\ndescription: ${description}\nuser_invocable: true\n---\n${body}`;
}

function copyDir(src, dest, dryRun) {
  if (!dryRun) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, dryRun);
    } else if (entry.isFile()) {
      let content = fs.readFileSync(from, "utf8");
      if (entry.name === "SKILL.md") content = adaptFrontmatter(content);
      if (!dryRun) fs.writeFileSync(to, content);
    }
  }
}

/**
 * Resolve and validate a destination inside the target before any removal.
 * Returns the absolute path or null (after reporting the problem).
 */
function safeDestFor(target, skillName, opts) {
  const targetAbs = path.resolve(target);
  const dest = path.resolve(targetAbs, skillName);
  const home = path.resolve(os.homedir());

  if (dest === path.parse(dest).root) {
    err(`Refusing: ${dest} is the filesystem root`);
    return null;
  }
  if (dest === home) {
    err(`Refusing: ${dest} is the home directory`);
    return null;
  }
  if (!dest.startsWith(targetAbs + path.sep)) {
    err(`Refusing: ${dest} is outside the target ${targetAbs}`);
    return null;
  }
  if (dest === targetAbs) {
    err(`Refusing: ${dest} equals the target`);
    return null;
  }
  if (opts && opts.force) {
    // Under --force the target itself must be a user-supplied path, not the
    // default skills dir resolved to home (defense in depth for skill dests).
    if (dest === path.join(home, ".claude", "skills")) {
      err(`Refusing: ${dest} is the default skills directory root`);
      return null;
    }
  }
  return dest;
}

function installSkill(skill, target, { link, force, dryRun }) {
  const dest = safeDestFor(target, skill.name, { force });
  if (!dest) return { name: skill.name, status: "error", dest: null };

  const exists = fs.existsSync(dest);
  if (exists && !force) {
    return { name: skill.name, status: "skipped (exists — use --force)", dest };
  }
  if (exists && force) {
    if (!dryRun) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
  if (link) {
    if (!dryRun) fs.symlinkSync(skill.src, dest, "dir");
    return { name: skill.name, status: "linked", dest };
  }
  copyDir(skill.src, dest, dryRun);
  return { name: skill.name, status: "installed", dest };
}

function runInstall(target, { link, force, dryRun }) {
  const skills = findSkillDirs();
  if (!skills.length) {
    err(`No skills found under ${SKILLS_GLOB}`);
    process.exitCode = 1;
    return;
  }
  const targetAbs = path.resolve(target);
  if (dryRun) {
    let wouldOverwrite = 0;
    let wouldSkip = 0;
    for (const s of skills) {
      const dest = path.resolve(targetAbs, s.name);
      if (fs.existsSync(dest)) {
        if (force) wouldOverwrite++;
        else wouldSkip++;
      }
    }
    log(`would install: ${skills.length - wouldOverwrite - wouldSkip}`);
    log(`would overwrite: ${wouldOverwrite}`);
    log(`would skip: ${wouldSkip}`);
    log(`target: ${targetAbs}${link ? "  (symlink mode)" : ""}`);
    log(`mode: ${dryRun ? "dry-run — no filesystem changes" : "install"}`);
    return;
  }

  fs.mkdirSync(targetAbs, { recursive: true });
  log(`agent-engineering-skills v${PKG.version} — installing ${skills.length} skills`);
  log(`target: ${targetAbs}${link ? "  (symlink mode)" : ""}${force ? "  (force)" : ""}`);
  log("");

  const results = skills.map((s) => installSkill(s, targetAbs, { link, force }));
  const counts = { installed: 0, linked: 0, skipped: 0, overwritten: 0, errors: 0 };
  for (const r of results) {
    if (r.status === "error") {
      counts.errors++;
      err(`  ✗ ${r.name} — refused`);
    } else if (r.status === "linked") {
      counts.linked++;
      log(`  ✓ ${r.name} — linked`);
    } else if (r.status === "overwritten") {
      counts.overwritten++;
      log(`  ✓ ${r.name} — overwritten`);
    } else if (r.status.startsWith("skipped")) {
      counts.skipped++;
      log(`  • ${r.name} — skipped`);
    } else {
      counts.installed++;
      log(`  ✓ ${r.name} — installed`);
    }
  }
  log("");
  log(
    `Done: ${counts.installed} installed, ${counts.linked} linked, ` +
      `${counts.overwritten} overwritten, ${counts.skipped} skipped.`
  );
  if (counts.errors) process.exitCode = 1;
}

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
  if (r.error) {
    err(`Failed to run python3: ${r.error.message}`);
    process.exitCode = 1;
    return false;
  }
  if (r.status !== 0) process.exitCode = r.status;
  return r.status === 0;
}

function runValidate() {
  runPython(VALIDATOR, []);
}

function checkSymlink(pathToCheck) {
  try {
    fs.lstatSync(pathToCheck);
  } catch {
    return null;
  }
  return fs.lstatSync(pathToCheck).isSymbolicLink() &&
    !fs.existsSync(pathToCheck) ? "broken" : null;
}

function runDoctor() {
  const checks = [];
  const nodeVersion = process.versions.node;
  checks.push({ name: "node version", ok: Number(nodeVersion.split(".")[0]) >= 18, detail: `v${nodeVersion}` });

  let pythonOk = false;
  let pythonDetail = "not found";
  try {
    const r = spawnSync("python3", ["--version"], { encoding: "utf8" });
    if (r.status === 0) {
      pythonOk = true;
      pythonDetail = (r.stdout || "").trim() || "ok";
    }
  } catch {
    /* pythonDetail stays */
  }
  checks.push({ name: "python availability", ok: pythonOk, detail: pythonDetail });

  checks.push({
    name: "repo integrity",
    ok: findSkillDirs().length > 0,
    detail: `${findSkillDirs().length} skills found`,
  });
  checks.push({ name: "catalog present", ok: fs.existsSync(CATALOG), detail: CATALOG });

  const target = DEFAULT_TARGET;
  const installed = [];
  if (fs.existsSync(target)) {
    for (const entry of fs.readdirSync(target)) {
      const p = path.join(target, entry);
      if (fs.statSync(p).isDirectory()) installed.push(entry);
    }
  }
  checks.push({ name: "installed skills", ok: installed.length > 0, detail: `${installed.length} in ${target}` });

  const broken = [];
  for (const entry of installed) {
    const brokenState = checkSymlink(path.join(target, entry));
    if (brokenState) broken.push(entry);
  }
  checks.push({ name: "broken symlinks", ok: broken.length === 0, detail: broken.length ? broken.join(", ") : "none" });

  let targetWritable = false;
  try {
    fs.accessSync(target, fs.constants.W_OK);
    targetWritable = true;
  } catch {
    /* read-only or missing */
  }
  checks.push({ name: "target permissions", ok: targetWritable || !fs.existsSync(target), detail: targetWritable ? "writable" : "not writable" });

  let ok = true;
  for (const c of checks) {
    if (!c.ok) ok = false;
    log(`  ${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  if (!ok) process.exitCode = 1;
}

function parseCatalogForList() {
  // Minimal parser for catalog/skills.yaml: top-level `- name:` entries,
  // scalar fields and nested list fields (`- item` under `field:`).
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
      // nested list item under the current listKey
      if (current && listKey) {
        current[listKey] = (current[listKey] || []).concat(trimmed.slice(2).replace(/^"|"$/g, ""));
      }
      continue;
    }
    if (current && trimmed.includes(":")) {
      const m = trimmed.match(/^(\w+):\s*(.*)$/);
      if (m) {
        if (m[2]) {
          current[m[1]] = m[2];
          listKey = null;
        } else {
          current[m[1]] = [];
          listKey = m[1];
        }
      }
    }
  }
  if (current) skills.push(current);
  return skills.filter((s) => s.name);
}

function runList() {
  if (!fs.existsSync(CATALOG)) {
    err("catalog/skills.yaml not found");
    process.exitCode = 1;
    return;
  }
  const skills = parseCatalogForList();
  const target = DEFAULT_TARGET;
  const installed = new Set(
    fs.existsSync(target)
      ? fs.readdirSync(target).filter((e) => fs.statSync(path.join(target, e)).isDirectory())
      : []
  );
  log("name                      category      role            priority  installed");
  for (const s of skills) {
    const mark = installed.has(s.name) ? "yes" : "no";
    log(
      `${(s.name || "").padEnd(26)} ${(s.category || "").padEnd(13)} ` +
      `${(s.role || "").padEnd(15)} ${(s.priority || "").padEnd(9)} ${mark}`
    );
  }
}

function runGraph(outFile) {
  if (!fs.existsSync(CATALOG)) {
    err("catalog/skills.yaml not found");
    process.exitCode = 1;
    return;
  }
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
  if (outFile) {
    fs.writeFileSync(path.resolve(outFile), output);
    log(`graph written to ${outFile}`);
  } else {
    process.stdout.write(output);
  }
}

function runEval(json) {
  const args = ["route", "--router", "v2", "--check"];
  if (json) args.push("--json");
  runPython(EVAL, args);
}

function parseArgs(argv) {
  const opts = {
    target: DEFAULT_TARGET, link: false, force: false, dryRun: false,
    command: null, out: null, json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      log(HELP);
      process.exit(0);
    } else if (a === "--version" || a === "-v") {
      log(PKG.version);
      process.exit(0);
    } else if (a === "--target") {
      opts.target = argv[++i] || "";
    } else if (a === "--link") {
      opts.link = true;
    } else if (a === "--force") {
      opts.force = true;
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--out") {
      opts.out = argv[++i] || null;
    } else if (a === "--json") {
      opts.json = true;
    } else if (a.startsWith("-")) {
      err(`Unknown option: ${a}\n`);
      log(HELP);
      process.exitCode = 1;
      return null;
    } else if (!opts.command) {
      opts.command = a;
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) return;
  const command = opts.command || "install";
  if (command === "install") {
    runInstall(opts.target, {
      link: opts.link, force: opts.force, dryRun: opts.dryRun,
    });
  } else if (command === "validate") {
    runValidate();
  } else if (command === "doctor") {
    runDoctor();
  } else if (command === "list") {
    runList();
  } else if (command === "graph") {
    runGraph(opts.out);
  } else if (command === "eval") {
    runEval(opts.json);
  } else {
    err(`Unknown command: ${command}\n`);
    log(HELP);
    process.exitCode = 1;
  }
}

main();
