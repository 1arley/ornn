#!/usr/bin/env node
/**
 * agent-engineering-skills — CLI
 *
 * Usage:
 *   npx agent-engineering-skills install [--target <dir>] [--link] [--force]
 *   npx agent-engineering-skills validate
 *   npx agent-engineering-skills --help
 *
 * `install` copies (or symlinks) the 24 skills into a Claude Code skills directory
 * (default: ~/.claude/skills), adapting the frontmatter to Claude Code's native
 * format (name + description) and making each skill user-invocable.
 *
 * Zero runtime dependencies — Node >= 18 only.
 */

import { execFileSync } from "node:child_process";
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
const DEFAULT_TARGET = path.join(os.homedir(), ".claude", "skills");

const HELP = `agent-engineering-skills v${PKG.version}

Modular skills that teach AI agents to audit systems, find bugs, review
UX/frontend, and research before reinventing.

Usage:
  agent-engineering-skills install [options]   Install the 24 skills into a
                                               Claude Code skills directory
  agent-engineering-skills validate            Run the repo validator
  agent-engineering-skills --help              Show this help
  agent-engineering-skills --version           Show version

Options (install):
  --target <dir>   Destination skills directory (default: ~/.claude/skills)
  --link           Create symlinks instead of copying
  --force          Overwrite existing skills with the same name
`;

function log(msg = "") {
  process.stdout.write(msg + "\n");
}

function err(msg) {
  process.stderr.write(msg + "\n");
}

/** List every <category>/<skill>/ directory under skills/. */
function findSkillDirs() {
  const dirs = [];
  if (!fs.existsSync(SKILLS_GLOB)) return dirs;
  for (const category of fs.readdirSync(SKILLS_GLOB)) {
    const catPath = path.join(SKILLS_GLOB, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const skill of fs.readdirSync(catPath)) {
      const skillPath = path.join(catPath, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      if (!fs.existsSync(path.join(skillPath, "SKILL.md"))) continue;
      dirs.push({ category, name: skill, src: skillPath });
    }
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Rewrite a SKILL.md frontmatter into Claude Code's native shape:
 *   - keep name + description (the fields the harness matches on)
 *   - add user_invocable so the skill can be invoked via slash command
 *   - drop plan.md-only fields (category/triggers/priority) that the harness
 *     does not use; their routing duty lives in the skill-router instead
 * Returns the rewritten file content (or original if unchanged).
 */
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
  if (!name || !description) return original; // don't mangle malformed files

  const adapted = `---\nname: ${name}\ndescription: ${description}\nuser_invocable: true\n---\n${body}`;
  return adapted;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      let content = fs.readFileSync(from, "utf8");
      if (entry.name === "SKILL.md") {
        content = adaptFrontmatter(content);
      }
      fs.writeFileSync(to, content);
    }
  }
}

function installSkill(skill, target, { link, force }) {
  const dest = path.join(target, skill.name);
  if (fs.existsSync(dest)) {
    if (!force) {
      return { name: skill.name, status: "skipped (exists — use --force)" };
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }
  if (link) {
    fs.symlinkSync(skill.src, dest, "dir");
    return { name: skill.name, status: "linked" };
  }
  copyDir(skill.src, dest);
  return { name: skill.name, status: "installed" };
}

function runInstall(target, { link, force }) {
  const skills = findSkillDirs();
  if (!skills.length) {
    err(`No skills found under ${SKILLS_GLOB}`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(target, { recursive: true });
  log(`agent-engineering-skills v${PKG.version} — installing ${skills.length} skills`);
  log(`target: ${target}${link ? "  (symlink mode)" : ""}${force ? "  (force)" : ""}`);
  log("");

  const results = skills.map((s) => installSkill(s, target, { link, force }));
  const counts = { installed: 0, linked: 0, skipped: 0 };
  for (const r of results) {
    if (r.status.startsWith("installed")) counts.installed++;
    else if (r.status === "linked") counts.linked++;
    else counts.skipped++;
    log(`  ${r.status.startsWith("skipped") ? "•" : "✓"} ${r.name} — ${r.status}`);
  }
  log("");
  log(
    `Done: ${counts.installed} installed, ${counts.linked} linked, ` +
      `${counts.skipped} skipped.`
  );
  log("");
  log("Skills are now available in your Claude Code skills directory.");
  log("Dispatch between them with skills/meta/skill-router (installed too).");
  log("Next: run 'python3 scripts/validate.py' or 'npx agent-engineering-skills validate'.");
}

function runValidate() {
  const script = path.join(ROOT, "scripts", "validate.py");
  if (!fs.existsSync(script)) {
    err(`Validator not found at ${script}`);
    process.exitCode = 1;
    return;
  }
  try {
    execFileSync("python3", [script], { stdio: "inherit" });
  } catch {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const opts = { target: DEFAULT_TARGET, link: false, force: false, command: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      log(HELP);
      process.exit(0);
    } else if (a === "--version" || a === "-v") {
      log(PKG.version);
      process.exit(0);
    } else if (a === "--target") {
      opts.target = path.resolve(argv[++i] || "");
    } else if (a === "--link") {
      opts.link = true;
    } else if (a === "--force") {
      opts.force = true;
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
  if (!opts.command || opts.command === "install") {
    runInstall(opts.target, { link: opts.link, force: opts.force });
  } else if (opts.command === "validate") {
    runValidate();
  } else {
    err(`Unknown command: ${opts.command}\n`);
    log(HELP);
    process.exitCode = 1;
  }
}

main();
